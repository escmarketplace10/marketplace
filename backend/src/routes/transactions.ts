import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { requireAdminOnly } from '../middleware/roleGuard';
import { getActorLabel } from '../middleware/actor';
import { recordAudit } from '../lib/audit';

const router = Router();

function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  // Pakai komponen waktu + acak supaya praktis tidak mungkin tabrakan
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  const rand = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  return `INV-${dateStr}-${timeStr}${rand}`;
}

// GET /api/transactions — daftar transaksi dengan filter lengkap utk admin
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date, status, payment_method, is_void, search, limit, offset } = req.query;

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
  if (payment_method) { query += ' AND t.payment_method = ?'; params.push(payment_method); }
  if (is_void !== undefined) { query += ' AND t.is_void = ?'; params.push(Number(is_void)); }
  if (search) {
    query += ' AND (t.receipt_number ILIKE ? OR c.name ILIKE ? OR e.name ILIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.created_at DESC';

  if (limit) { query += ' LIMIT ?'; params.push(Number(limit)); } else { query += ' LIMIT 100'; }
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
    items, payment_method, cash_amount, discount_total, notes, keep_change
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

    // Blokir jual kalau stok kasir tidak cukup (produk yang dilacak stoknya).
    if (Number(product.is_track_stock) === 1 && Number(product.cashier_stock) < quantity) {
      return res.status(400).json({ error: `Stok kasir tidak cukup untuk ${product.name}` });
    }

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
  const overpaid = Math.max(0, cashPaid - grandTotal);
  // Kalau pelanggan tidak ambil kembalian, uang lebih dicatat terpisah (masuk
  // kas), bukan sebagai kembalian.
  const changeAmount = keep_change ? 0 : overpaid;
  const overpayAmount = keep_change ? overpaid : 0;

  // Begin transaction
  await db.transaction(async (tx) => {
    await tx.run(`
      INSERT INTO transactions (id, receipt_number, employee_id, customer_id,
        order_type, order_reference, subtotal, discount_total, grand_total,
        payment_method, payment_status, cash_amount, change_amount, overpay_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, 'completed', ?)
    `, [trxId, receiptNumber, employee_id, customer_id || null,
        order_type || 'dine_in', order_reference || null, subtotal, discount, grandTotal,
        payment_method || 'cash', cashPaid, changeAmount, overpayAmount, notes || null]);

    for (const item of trxItems) {
      await tx.run(`
        INSERT INTO transaction_items (id, transaction_id, product_id, product_name,
          quantity, unit_price, discount_amount, total_price, modifier_details, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.transaction_id, item.product_id, item.product_name,
          item.quantity, item.unit_price, item.discount_amount, item.total_price,
          item.modifier_details, item.notes, item.status]);

      // Kurangi stok kasir (bukan stok gudang).
      await tx.run(`
        UPDATE products SET cashier_stock = cashier_stock - ?, updated_at = now() WHERE id = ? AND is_track_stock = 1
      `, [item.quantity, item.product_id]);
      await tx.run(`
        INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, created_by)
        VALUES (?, ?, 'out', ?, 'sale', ?, 'cashier', ?)
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
    transaction: { id: trxId, receipt_number: receiptNumber, grand_total: grandTotal, change_amount: changeAmount, overpay_amount: overpayAmount }
  });
});

// POST /api/transactions/:id/void - Void a transaction (Admin lewat Website saja)
router.post('/:id/void', requireAdminOnly, async (req: Request, res: Response) => {
  const db = getDb();
  const { reason } = req.body;
  const voidBy = getActorLabel(req);

  const trx = await db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id]) as any;
  if (!trx) return res.status(404).json({ error: 'Transaction not found' });

  if (trx.is_void) return res.status(400).json({ error: 'Transaction already voided' });

  await db.transaction(async (tx) => {
    await tx.run(`UPDATE transactions SET is_void = 1, void_reason = ?, void_by = ?, status = 'voided', updated_at = now() WHERE id = ?`,
      [reason || 'Tanpa alasan', voidBy, req.params.id]);

    // Restore stock
    const items = await tx.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [req.params.id]) as any[];
    for (const item of items) {
      await tx.run('UPDATE products SET cashier_stock = cashier_stock + ? WHERE id = ? AND is_track_stock = 1', [item.quantity, item.product_id]);
      await tx.run(`INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, notes, created_by)
        VALUES (?, ?, 'in', ?, 'void', ?, 'cashier', ?, ?)`,
        [uuid(), item.product_id, item.quantity, req.params.id, `Dikembalikan dari void: ${reason || 'Tanpa alasan'}`, voidBy]);
    }
  });
  await recordAudit(req, {
    action: 'void', entity: 'transaction', entity_id: req.params.id,
    summary: `Membatalkan (void) transaksi ${trx.receipt_number || req.params.id}. Alasan: ${reason || 'Tanpa alasan'}`,
  });
  return res.json({ success: true });
});

export default router;
