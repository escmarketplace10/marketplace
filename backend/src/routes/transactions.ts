import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { requireAdminOnly, requireCashierOrAdmin } from '../middleware/roleGuard';
import { requireSuperAdmin } from '../middleware/permissions';
import { getActorLabel } from '../middleware/actor';
import { recordAudit } from '../lib/audit';
import { validate } from '../middleware/validate';
import { createTransactionSchema } from '../lib/schemas';

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
  const auth = (req as any).auth;
  if (auth?.kind === 'employee' && auth.role === 'waiter') {
    query += ' AND t.employee_id = ?';
    params.push(auth.id);
  }

  if (start_date) { query += ' AND t.created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND t.created_at <= ?'; params.push(end_date); }
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (payment_method) { query += ' AND t.payment_method = ?'; params.push(payment_method); }
  if (is_void !== undefined) { query += ' AND t.is_void = ?'; params.push(Number(is_void)); }
  if (search) {
    query += ' AND (t.receipt_number ILIKE ? OR t.transaction_name ILIKE ? OR c.name ILIKE ? OR e.name ILIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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
  const auth = (req as any).auth;
  if (auth?.kind === 'employee' && auth.role === 'waiter' && transaction.employee_id !== auth.id) {
    return res.status(403).json({ error: 'Hanya boleh melihat pesanan sendiri.' });
  }

  const items = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [req.params.id]);
  return res.json({ ...transaction, items });
});

// POST /api/transactions - Create new transaction
router.post('/', validate(createTransactionSchema), async (req: Request, res: Response) => {
  const db = getDb();
  const {
    employee_id, customer_id, order_type, order_reference, transaction_name,
    items, discount_total, notes
  } = req.body;

  if (!employee_id || !items || !items.length) {
    return res.status(400).json({ error: 'employee_id and items required' });
  }
  const auth = (req as any).auth;
  if (auth?.kind !== 'employee' || !['waiter', 'cashier'].includes(auth.role)) {
    return res.status(403).json({ error: 'Hanya waiter atau kasir yang dapat mencatat pesanan.' });
  }
  if (employee_id !== auth.id) return res.status(403).json({ error: 'Identitas penginput tidak sesuai sesi.' });
  if (auth.role === 'waiter' && Number(discount_total || 0) > 0) {
    return res.status(403).json({ error: 'Waiter tidak dapat memberi diskon.' });
  }
  if (auth.role === 'waiter' && customer_id) {
    return res.status(403).json({ error: 'Waiter tidak dapat mengubah data pelanggan.' });
  }

  const trxId = uuid();
  const receiptNumber = generateReceiptNumber();

  // Calculate totals
  let subtotal = 0;
  const trxItems: any[] = [];

  for (const item of items) {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [item.product_id]) as any;
    if (!product) continue;

    const unitPrice = auth.role === 'waiter' ? Number(product.price) : (item.unit_price ?? product.price);
    const itemDiscount = auth.role === 'waiter' ? 0 : (item.discount_amount || 0);
    const quantity = item.quantity || 1;

    // Blokir jual kalau stok kasir tidak cukup (produk yang dilacak stoknya).
    if (Number(product.is_track_stock) === 1 && Number(product.cashier_stock) < quantity) {
      return res.status(400).json({ error: `Stok kasir tidak cukup untuk ${product.name}` });
    }

    const totalPrice = (unitPrice * quantity) - itemDiscount;
    if (totalPrice < 0) return res.status(400).json({ error: `Diskon item melebihi harga ${product.name}.` });
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
      consignor_id: product.consignor_id || null,
      commission_mode: product.consignor_id ? (product.commission_mode || 'percent') : 'none',
      commission_value: product.consignor_id
        ? (product.commission_mode === 'amount' ? Number(product.commission_amount || 0) : Number(product.commission_percent || 0))
        : 0,
      status: 'pending'
    });
  }

  if (!trxItems.length) {
    return res.status(400).json({ error: 'Produk tidak ditemukan. Muat ulang daftar produk.' });
  }

  const discount = discount_total || 0;
  const grandTotal = subtotal - discount;
  if (grandTotal < 0) return res.status(400).json({ error: 'Diskon melebihi total pesanan.' });

  // Begin transaction
  await db.transaction(async (tx) => {
    await tx.run(`
      INSERT INTO transactions (id, receipt_number, employee_id, customer_id,
        order_type, order_reference, transaction_name, subtotal, discount_total, grand_total,
        payment_method, payment_status, cash_amount, change_amount, overpay_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL, 0, 0, 'open', ?)
    `, [trxId, receiptNumber, employee_id, customer_id || null,
        order_type || 'dine_in', order_reference || null, transaction_name.trim(), subtotal, discount, grandTotal, notes || null]);

    for (const item of trxItems) {
      await tx.run(`
        INSERT INTO transaction_items (id, transaction_id, product_id, product_name,
          quantity, unit_price, discount_amount, total_price, modifier_details, notes,
          consignor_id, commission_mode, commission_value, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.transaction_id, item.product_id, item.product_name,
          item.quantity, item.unit_price, item.discount_amount, item.total_price,
          item.modifier_details, item.notes, item.consignor_id, item.commission_mode,
          item.commission_value, item.status]);

      // Kurangi stok kasir (bukan stok gudang).
      await tx.run(`
        UPDATE products SET cashier_stock = cashier_stock - ?, updated_at = now() WHERE id = ? AND is_track_stock = 1
      `, [item.quantity, item.product_id]);
      await tx.run(`
        INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, created_by)
        VALUES (?, ?, 'out', ?, 'sale', ?, 'cashier', ?)
      `, [uuid(), item.product_id, item.quantity, trxId, employee_id]);
    }

  });

  return res.json({
    success: true,
    transaction: { id: trxId, receipt_number: receiptNumber, transaction_name, grand_total: grandTotal, payment_status: 'pending' }
  });
});

// Checklist jumlah item yang benar-benar sudah diserahkan ke pelanggan.
router.patch('/:id/items/:itemId/delivery', async (req: Request, res: Response) => {
  const auth = (req as any).auth;
  if (auth?.kind !== 'employee' || auth.role !== 'cashier') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }
  const quantity = req.body.delivered_quantity;
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
    return res.status(400).json({ error: 'Jumlah terantar tidak valid.' });
  }
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const trx = await tx.get('SELECT employee_id, payment_status, is_void FROM transactions WHERE id = ? FOR UPDATE', [req.params.id]) as any;
      if (!trx) throw new Error('Pesanan tidak ditemukan.');
      if (trx.payment_status !== 'pending' || trx.is_void) throw new Error('Checklist pesanan ini sudah ditutup.');
      const item = await tx.get('SELECT quantity FROM transaction_items WHERE id = ? AND transaction_id = ?', [req.params.itemId, req.params.id]) as any;
      if (!item) throw new Error('Item tidak ditemukan.');
      if (quantity > Number(item.quantity)) throw new Error('Jumlah terantar melebihi pesanan.');
      await tx.run('UPDATE transaction_items SET delivered_quantity = ? WHERE id = ? AND transaction_id = ?', [quantity, req.params.itemId, req.params.id]);
    });
  } catch (e) {
    return res.status(409).json({ error: e instanceof Error ? e.message : 'Checklist gagal disimpan.' });
  }
  return res.json({ success: true });
});

router.post('/:id/pay', async (req: Request, res: Response) => {
  const auth = (req as any).auth;
  if (auth?.kind !== 'employee' || auth.role !== 'cashier') {
    return res.status(403).json({ error: 'Hanya kasir yang dapat menerima pembayaran.' });
  }
  const { payment_method, cash_amount, keep_change } = req.body;
  if (!['cash', 'qris', 'card', 'ewallet'].includes(payment_method)) {
    return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
  }
  if (payment_method === 'cash' && (typeof cash_amount !== 'number' || !Number.isFinite(cash_amount))) {
    return res.status(400).json({ error: 'Jumlah uang tunai wajib diisi.' });
  }
  const db = getDb();
  let paid: any;
  try {
    await db.transaction(async (tx) => {
      const trx = await tx.get('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [req.params.id]) as any;
      if (!trx || trx.is_void || trx.payment_status !== 'pending') throw new Error('Pesanan tidak tersedia untuk pembayaran.');
      const items = await tx.all('SELECT quantity, delivered_quantity FROM transaction_items WHERE transaction_id = ?', [req.params.id]) as any[];
      if (!items.length || items.some((it) => Number(it.delivered_quantity) < Number(it.quantity))) {
        throw new Error('Semua item harus ditandai terantar sebelum tutup bill.');
      }
      const total = Number(trx.grand_total);
      const cash = payment_method === 'cash' ? cash_amount : total;
      if (cash < total) throw new Error('Uang diterima kurang dari total tagihan.');
      const excess = Math.max(0, cash - total);
      const change = keep_change ? 0 : excess;
      const overpay = keep_change ? excess : 0;
      await tx.run(`UPDATE transactions SET payment_method = ?, payment_status = 'completed',
        cash_amount = ?, change_amount = ?, overpay_amount = ?, status = 'completed', paid_by = ?, paid_at = now(), updated_at = now()
        WHERE id = ?`, [payment_method, cash, change, overpay, auth.id, req.params.id]);
      if (trx.customer_id) {
        const points = Math.floor(total / 10000);
        await tx.run(`UPDATE customers SET total_spent = total_spent + ?, visit_count = visit_count + 1,
          points = points + ?, updated_at = now() WHERE id = ?`, [total, points, trx.customer_id]);
        await tx.run(`INSERT INTO loyalty_points_history (id, customer_id, points, type, transaction_id, description)
          VALUES (?, ?, ?, 'earn', ?, ?)`, [uuid(), trx.customer_id, points, req.params.id, 'Points from purchase #' + trx.receipt_number]);
      }
      paid = { id: trx.id, receipt_number: trx.receipt_number, transaction_name: trx.transaction_name,
        grand_total: total, change_amount: change, overpay_amount: overpay, payment_status: 'completed' };
    });
  } catch (e) {
    return res.status(409).json({ error: e instanceof Error ? e.message : 'Pembayaran gagal.' });
  }
  return res.json({ success: true, transaction: paid });
});

// POST /api/transactions/:id/void - Kasir atau admin membatalkan transaksi.
router.post('/:id/void', requireCashierOrAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const reason = String(req.body?.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Alasan pembatalan wajib diisi.' });
  const voidBy = getActorLabel(req);

  const trx = await db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id]) as any;
  if (!trx) return res.status(404).json({ error: 'Transaction not found' });

  if (trx.is_void) return res.status(400).json({ error: 'Transaction already voided' });

  try {
    await db.transaction(async (tx) => {
    const current = await tx.get('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [req.params.id]) as any;
    if (!current || current.is_void) throw new Error('Transaksi sudah dibatalkan.');
    await tx.run(`UPDATE transactions SET is_void = 1, void_reason = ?, void_by = ?, status = 'voided', updated_at = now() WHERE id = ?`,
      [reason, voidBy, req.params.id]);

    // Restore stock
    const items = await tx.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [req.params.id]) as any[];
    for (const item of items) {
      await tx.run('UPDATE products SET cashier_stock = cashier_stock + ? WHERE id = ? AND is_track_stock = 1', [item.quantity, item.product_id]);
      await tx.run(`INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, notes, created_by)
        VALUES (?, ?, 'in', ?, 'void', ?, 'cashier', ?, ?)`,
        [uuid(), item.product_id, item.quantity, req.params.id, `Dikembalikan dari void: ${reason}`, voidBy]);
    }
    if (current.customer_id && current.payment_status === 'completed') {
      const earned = await tx.get("SELECT COALESCE(SUM(points), 0) AS points FROM loyalty_points_history WHERE transaction_id = ? AND type = 'earn'", [req.params.id]) as any;
      await tx.run(`UPDATE customers SET total_spent = GREATEST(0, total_spent - ?),
        visit_count = GREATEST(0, visit_count - 1), points = GREATEST(0, points - ?), updated_at = now()
        WHERE id = ?`, [current.grand_total, earned?.points || 0, current.customer_id]);
      await tx.run('DELETE FROM loyalty_points_history WHERE transaction_id = ?', [req.params.id]);
    }
  });
  } catch (e) {
    return res.status(409).json({ error: e instanceof Error ? e.message : 'Transaksi gagal dibatalkan.' });
  }
  await recordAudit(req, {
    action: 'void', entity: 'transaction', entity_id: req.params.id,
    summary: `Membatalkan (void) transaksi ${trx.receipt_number || req.params.id}. Alasan: ${reason}`,
  });
  return res.json({ success: true });
});

// Hanya SuperAdmin yang boleh menghapus transaksi Void secara permanen.
router.delete('/:id', requireAdminOnly, requireSuperAdmin, async (req: Request, res: Response) => {
  const reason = String(req.body?.reason || '').trim();
  const confirmation = String(req.body?.confirm_receipt_number || '').trim();
  if (reason.length < 10) return res.status(400).json({ error: 'Alasan penghapusan minimal 10 karakter.' });
  const db = getDb();
  const trx = await db.get('SELECT id, receipt_number, is_void FROM transactions WHERE id = ?', [req.params.id]) as any;
  if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  if (!trx.is_void) return res.status(409).json({ error: 'Hanya transaksi Void yang dapat dihapus permanen.' });
  if (confirmation !== trx.receipt_number) return res.status(400).json({ error: 'Nomor struk konfirmasi tidak cocok.' });

  try {
    await db.transaction(async (tx) => {
      const current = await tx.get('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [req.params.id]) as any;
      if (!current?.is_void) throw new Error('Transaksi tidak lagi berstatus Void.');
      const earned = await tx.get("SELECT COALESCE(SUM(points), 0) AS points, COUNT(*) AS count FROM loyalty_points_history WHERE transaction_id = ? AND type = 'earn'", [req.params.id]) as any;
      if (current.customer_id && Number(earned?.count || 0) > 0) {
        await tx.run(`UPDATE customers SET total_spent = GREATEST(0, total_spent - ?),
          visit_count = GREATEST(0, visit_count - 1), points = GREATEST(0, points - ?), updated_at = now()
          WHERE id = ?`, [current.grand_total, earned.points, current.customer_id]);
      }
      await tx.run('DELETE FROM loyalty_points_history WHERE transaction_id = ?', [req.params.id]);
      await tx.run("DELETE FROM inventory_movements WHERE reference_id = ? AND reference_type IN ('sale', 'void')", [req.params.id]);
      await tx.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    });
  } catch (e) {
    return res.status(409).json({ error: e instanceof Error ? e.message : 'Transaksi gagal dihapus.' });
  }
  await recordAudit(req, { action: 'delete', entity: 'transaction', entity_id: req.params.id,
    summary: `Menghapus permanen transaksi Void ${trx.receipt_number}. Alasan: ${reason}` });
  return res.json({ success: true });
});

export default router;
