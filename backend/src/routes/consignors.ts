import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { recordAudit } from '../lib/audit';

const router = Router();

// Nilai pada item adalah snapshot saat pesanan dibuat; produk lama memakai pengaturan saat ini.
const itemConsignor = 'CASE WHEN ti.commission_mode IS NULL THEN p.consignor_id ELSE ti.consignor_id END';
const storeCommission = `CASE WHEN COALESCE(ti.commission_mode, p.commission_mode, 'percent') = 'amount'
  THEN LEAST(ti.total_price, ti.quantity * COALESCE(ti.commission_value, p.commission_amount, 0))
  ELSE ti.total_price * COALESCE(ti.commission_value, p.commission_percent, 0) / 100.0 END`;

/** Hitung total penjualan/komisi/terutang sejak setoran terakhir (atau sejak awal bila belum pernah setor). */
async function unsettledSummary(db: any, consignorId: string, until?: string) {
  const last = await db.get('SELECT MAX(period_end) as last_end FROM consignment_settlements WHERE consignor_id = ?', [consignorId]) as any;
  const since = last?.last_end || '1970-01-01 00:00:00';

  let query = `
    SELECT
      COALESCE(SUM(ti.total_price), 0) as total_sales,
      COALESCE(SUM(${storeCommission}), 0) as commission_amount
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE ${itemConsignor} = ? AND t.is_void = 0 AND t.payment_status = 'completed' AND COALESCE(t.paid_at, t.created_at) > ?
  `;
  const params: any[] = [consignorId, since];
  if (until) { query += ' AND COALESCE(t.paid_at, t.created_at) <= ?'; params.push(until); }

  const row = await db.get(query, [...params]) as any;
  const total_sales = row.total_sales || 0;
  const commission_amount = row.commission_amount || 0;
  return { since, total_sales, commission_amount, payable_amount: total_sales - commission_amount };
}

// GET /api/consignors - List semua penitip + rekap belum disetor
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { search } = req.query;
  let query = "SELECT * FROM consignors WHERE is_active = 1";
  const params: any[] = [];
  if (search) { query += ' AND name ILIKE ?'; params.push(`%${search}%`); }
  query += ' ORDER BY name ASC';

  const consignors = await db.all(query, params) as any[];
  const result = await Promise.all(consignors.map(async c => ({ ...c, ...(await unsettledSummary(db, c.id)) })));
  return res.json(result);
});

// GET /api/consignors/monthly?month=YYYY-MM - Hanya penjualan lunas dalam bulan terpilih.
router.get('/monthly', async (req: Request, res: Response) => {
  const month = String(req.query.month || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: 'Bulan harus berformat YYYY-MM.' });
  const [year, number] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = `${year + (number === 12 ? 1 : 0)}-${String(number === 12 ? 1 : number + 1).padStart(2, '0')}-01`;
  const db = getDb();
  const rows = await db.all(`
    SELECT c.id, c.name, COALESCE(s.quantity, 0) AS quantity,
           COALESCE(s.total_sales, 0) AS total_sales,
           COALESCE(s.commission_amount, 0) AS commission_amount,
           COALESCE(s.total_sales - s.commission_amount, 0) AS payable_amount
    FROM consignors c
    LEFT JOIN (
      SELECT ${itemConsignor} AS consignor_id, SUM(ti.quantity) AS quantity,
             SUM(ti.total_price) AS total_sales, SUM(${storeCommission}) AS commission_amount
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      JOIN products p ON p.id = ti.product_id
      WHERE t.is_void = 0 AND t.payment_status = 'completed'
        AND COALESCE(t.paid_at, t.created_at) >= ?
        AND COALESCE(t.paid_at, t.created_at) < ?
      GROUP BY ${itemConsignor}
    ) s ON s.consignor_id = c.id
    WHERE c.is_active = 1 OR s.consignor_id IS NOT NULL
    ORDER BY c.name ASC
  `, [start, end]);
  return res.json({ month, rows });
});

// GET /api/consignors/:id - Satu penitip + rekap
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const consignor = await db.get('SELECT * FROM consignors WHERE id = ?', [req.params.id]);
  if (!consignor) return res.status(404).json({ error: 'Penitip tidak ditemukan' });
  return res.json({ ...consignor, ...(await unsettledSummary(db, req.params.id)) });
});

// GET /api/consignors/:id/report - Rincian item terjual yang belum disetor
router.get('/:id/report', async (req: Request, res: Response) => {
  const db = getDb();
  const summary = await unsettledSummary(db, req.params.id);

  const items = await db.all(`
    SELECT t.receipt_number, COALESCE(t.paid_at, t.created_at) as created_at,
           ti.product_name, ti.quantity, ti.unit_price, ti.total_price,
           COALESCE(ti.commission_mode, p.commission_mode, 'percent') AS commission_mode,
           COALESCE(ti.commission_value, CASE WHEN p.commission_mode = 'amount' THEN p.commission_amount ELSE p.commission_percent END, 0) AS commission_value,
           (${storeCommission}) as commission_amount,
           (ti.total_price - (${storeCommission})) as payable_amount
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE ${itemConsignor} = ? AND t.is_void = 0 AND t.payment_status = 'completed' AND COALESCE(t.paid_at, t.created_at) > ?
    ORDER BY COALESCE(t.paid_at, t.created_at) ASC
  `, [req.params.id, summary.since]);

  return res.json({ ...summary, items });
});

// GET /api/consignors/:id/settlements - Riwayat setoran
router.get('/:id/settlements', async (req: Request, res: Response) => {
  const db = getDb();
  const settlements = await db.all('SELECT * FROM consignment_settlements WHERE consignor_id = ? ORDER BY created_at DESC', [req.params.id]);
  return res.json(settlements);
});

// POST /api/consignors - Tambah penitip
router.post('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { name, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama wajib diisi' });

  const id = uuid();
  await db.run('INSERT INTO consignors (id, name, phone, notes) VALUES (?, ?, ?, ?)', [id, name, phone || null, notes || null]);
  await recordAudit(req, { action: 'create', entity: 'consignor', entity_id: id, summary: `Menambah penitip "${name}"` });
  return res.json({ success: true, id });
});

// PUT /api/consignors/:id - Ubah penitip
router.put('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const { name, phone, notes, is_active } = req.body;
  await db.run(`
    UPDATE consignors SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      notes = COALESCE(?, notes),
      is_active = COALESCE(?, is_active),
      updated_at = now()
    WHERE id = ?
  `, [name || null, phone || null, notes || null, is_active ?? null, req.params.id]);
  await recordAudit(req, { action: 'update', entity: 'consignor', entity_id: req.params.id, summary: `Mengubah penitip "${name ?? req.params.id}"` });
  return res.json({ success: true });
});

// DELETE /api/consignors/:id - Hapus penitip (ditolak bila masih ada produk titipannya)
router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const productCount = await db.get('SELECT COUNT(*) as count FROM products WHERE consignor_id = ?', [req.params.id]) as any;
  if (productCount.count > 0) {
    return res.status(400).json({ error: 'Tidak bisa hapus penitip yang masih punya produk titipan.' });
  }
  const existing = await db.get('SELECT name FROM consignors WHERE id = ?', [req.params.id]) as any;
  await db.run('DELETE FROM consignors WHERE id = ?', [req.params.id]);
  await recordAudit(req, { action: 'delete', entity: 'consignor', entity_id: req.params.id, summary: `Menghapus penitip "${existing?.name ?? req.params.id}"` });
  return res.json({ success: true });
});

// POST /api/consignors/:id/settle - Catat setoran (tandai penjualan saat ini sebagai sudah dibayar)
router.post('/:id/settle', async (req: Request, res: Response) => {
  const db = getDb();
  const consignor = await db.get('SELECT * FROM consignors WHERE id = ?', [req.params.id]);
  if (!consignor) return res.status(404).json({ error: 'Penitip tidak ditemukan' });

  const periodEnd = (await db.get('SELECT now() as t') as any).t;
  const summary = await unsettledSummary(db, req.params.id, periodEnd);
  if (summary.total_sales <= 0) {
    return res.status(400).json({ error: 'Tidak ada penjualan yang belum disetor.' });
  }

  const id = uuid();
  await db.run(`
    INSERT INTO consignment_settlements (id, consignor_id, period_start, period_end, total_sales, commission_amount, payable_amount, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.params.id, summary.since, periodEnd, summary.total_sales, summary.commission_amount, summary.payable_amount, req.body.notes || null, req.body.created_by || null]);

  return res.json({ success: true, id, period_end: periodEnd, ...summary });
});

export default router;
