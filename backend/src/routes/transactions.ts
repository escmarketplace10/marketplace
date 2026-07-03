import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  // Pakai komponen waktu + acak supaya praktis tidak mungkin tabrakan
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  const rand = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  return `INV-${dateStr}-${timeStr}${rand}`;
}

// GET /api/transactions
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date, status, limit, offset } = req.query;

  let query = `
    SELECT t.*, e.name as employee_name, c.name as customer_name
    FROM transactions t
    LEFT JOIN employees e ON t.employee_id = e.id
    LEFT JOIN customers c ON t.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];


  if (start_date) { query += ' AND t.created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND t.created_at <= ?'; params.push(end_date); }
  if (status) { query += ' AND t.status = ?'; params.push(status); }

  query += ' ORDER BY t.created_at DESC';

  if (limit) { query += ' LIMIT ?'; params.push(Number(limit)); } else { query += ' LIMIT 50'; }
  if (offset) { query += ' OFFSET ?'; params.push(Number(offset)); }

  return res.json(await db.all(query, params));
});

// GET /api/transactions/:id
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const transaction = await db.get(`
    SELECT t.*, e.name as employee_name, c.name as customer_name
    FROM transactions t
    LEFT JOIN employees e ON t.employee_id = e.id
    LEFT JOIN customers c ON t.customer_id = c.id
    WHERE t.id = ?
  `, [req.params.id]) as any;

  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

  const items = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [req.params.id]);
  return res.json({ ...transaction, items });
});

// POST /api/transactions - Create new transaction
router.post('/', async (req: Request, res: Response) => {
  const db = getDb();
  const {
    employee_id, customer_id, order_type, order_reference,
    items, payment_method, cash_amount, discount_total, notes
  } = req.body;

  if (!employee_id || !items || !items.length) {
    return res.status(400).json({ error: 'employee_id and items required' });
  }

  const trxId = uuid();
  const receiptNumber = generateReceiptNumber();

  // Calculate totals
  let subtotal = 0;
  const trxItems: any[] = [];

  for (const item of items) {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [item.product_id]) as any;
    if (!product) continue;

    const unitPrice = item.unit_price ?? product.price;
    const itemDiscount = item.discount_amount || 0;
    const quantity = item.quantity || 1;
    const totalPrice = (unitPrice * quantity) - itemDiscount;
    subtotal += totalPrice;

    trxItems.push({
      id: uuid(),
      transaction_id: trxId,
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: unitPrice,
      discount_amount: itemDiscount,
      total_price: totalPrice,
      modifier_details: item.modifier_details ? JSON.stringify(item.modifier_details) : null,
      notes: item.notes || null,
      status: 'completed'
    });
  }

  if (!trxItems.length) {
    return res.status(400).json({ error: 'Produk tidak ditemukan. Muat ulang daftar produk.' });
  }

  const discount = discount_total || 0;
  const grandTotal = subtotal - discount;

  // Use provided cash_amount or default to grand_total
  const cashPaid = cash_amount || grandTotal;
  const changeAmount = Math.max(0, cashPaid - grandTotal);

  // Begin transaction
  await db.transaction(async (tx) => {
    await tx.run(`
      INSERT INTO transactions (id, receipt_number, employee_id, customer_id,
        order_type, order_reference, subtotal, discount_total, grand_total,
        payment_method, payment_status, cash_amount, change_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, 'completed', ?)
    `, [trxId, receiptNumber, employee_id, customer_id || null,
        order_type || 'dine_in', order_reference || null, subtotal, discount, grandTotal,
        payment_method || 'cash', cashPaid, changeAmount, notes || null]);

    for (const item of trxItems) {
      await tx.run(`
        INSERT INTO transaction_items (id, transaction_id, product_id, product_name,
          quantity, unit_price, discount_amount, total_price, modifier_details, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.transaction_id, item.product_id, item.product_name,
          item.quantity, item.unit_price, item.discount_amount, item.total_price,
          item.modifier_details, item.notes, item.status]);

      // Deduct stock
      await tx.run(`
        UPDATE products SET stock = stock - ?, updated_at = now() WHERE id = ? AND is_track_stock = 1
      `, [item.quantity, item.product_id]);
      await tx.run(`
        INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, created_by)
        VALUES (?, ?, 'out', ?, 'sale', ?, ?)
      `, [uuid(), item.product_id, item.quantity, trxId, employee_id]);
    }

    // Update customer loyalty
    if (customer_id) {
      const pointsEarned = Math.floor(grandTotal / 10000); // 1 point per 10k
      await tx.run(`
        UPDATE customers SET
          total_spent = total_spent + ?,
          visit_count = visit_count + 1,
          points = points + ?,
          updated_at = now()
        WHERE id = ?
      `, [grandTotal, pointsEarned, customer_id]);
      await tx.run(`
        INSERT INTO loyalty_points_history (id, customer_id, points, type, transaction_id, description)
        VALUES (?, ?, ?, 'earn', ?, ?)
      `, [uuid(), customer_id, pointsEarned, trxId, 'Points from purchase #' + receiptNumber]);
    }
  });

  return res.json({
    success: true,
    transaction: { id: trxId, receipt_number: receiptNumber, grand_total: grandTotal, change_amount: changeAmount }
  });
});

// POST /api/transactions/:id/void - Void a transaction
router.post('/:id/void', async (req: Request, res: Response) => {
  const db = getDb();
  const { reason, void_by } = req.body;

  const trx = await db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id]) as any;
  if (!trx) return res.status(404).json({ error: 'Transaction not found' });

  if (trx.is_void) return res.status(400).json({ error: 'Transaction already voided' });

  await db.transaction(async (tx) => {
    await tx.run(`UPDATE transactions SET is_void = 1, void_reason = ?, void_by = ?, status = 'voided', updated_at = now() WHERE id = ?`,
      [reason || 'No reason', void_by || null, req.params.id]);

    // Restore stock
    const items = await tx.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [req.params.id]) as any[];
    for (const item of items) {
      await tx.run('UPDATE products SET stock = stock + ? WHERE id = ? AND is_track_stock = 1', [item.quantity, item.product_id]);
      await tx.run(`INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, notes)
        VALUES (?, ?, 'in', ?, 'void', ?, ?)`,
        [uuid(), item.product_id, item.quantity, req.params.id, 'Restocked from void']);
    }
  });
  return res.json({ success: true });
});

export default router;
