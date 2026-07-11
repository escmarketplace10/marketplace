import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { requireStockAccess } from '../middleware/roleGuard';
import { getActorLabel } from '../middleware/actor';
import { recordAudit } from '../lib/audit';

const router = Router();

function generatePONumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `PO-${dateStr}-${rand}`;
}

// GET /api/purchase-orders
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { status, supplier_id, start_date, end_date } = req.query;
  let query = `
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status) { query += ' AND po.status = ?'; params.push(status); }
  if (supplier_id) { query += ' AND po.supplier_id = ?'; params.push(supplier_id); }
  if (start_date) { query += ' AND po.created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND po.created_at <= ?'; params.push(end_date); }
  query += ' ORDER BY po.created_at DESC';
  return res.json(await db.all(query, params));
});

// GET /api/purchase-orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const po = await db.get(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `, [req.params.id]) as any;
  if (!po) return res.status(404).json({ error: 'PO not found' });

  const items = await db.all(`
    SELECT poi.*, p.name as product_name, p.sku
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_id = p.id
    WHERE poi.po_id = ?
  `, [req.params.id]);

  return res.json({ ...po, items });
});

// POST /api/purchase-orders (bukan untuk kasir)
router.post('/', requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const { supplier_id, items, notes } = req.body;
  if (!supplier_id || !items?.length) return res.status(400).json({ error: 'supplier_id and items required' });

  const id = uuid();
  const poNumber = generatePONumber();

  // Hitung total dulu supaya bisa disimpan sekaligus & dikembalikan di respons
  let totalAmount = 0;
  const poItems = items.map((item: any) => {
    const unitCost = item.unit_cost || 0;
    const qty = item.quantity || 1;
    const total = unitCost * qty;
    totalAmount += total;
    return { id: uuid(), product_id: item.product_id, quantity: qty, unit_cost: unitCost, total_cost: total };
  });

  await db.transaction(async (tx) => {
    await tx.run('INSERT INTO purchase_orders (id, po_number, supplier_id, notes, total_amount) VALUES (?, ?, ?, ?, ?)',
      [id, poNumber, supplier_id, notes || null, totalAmount]);

    for (const item of poItems) {
      await tx.run(`
        INSERT INTO purchase_order_items (id, po_id, product_id, quantity, unit_cost, total_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [item.id, id, item.product_id, item.quantity, item.unit_cost, item.total_cost]);
    }
  });

  await recordAudit(req, { action: 'create', entity: 'purchase_order', entity_id: id, summary: `Membuat pembelian ${poNumber} (Rp${Number(totalAmount).toLocaleString('id-ID')})` });
  return res.json({ success: true, id, po_number: poNumber, total_amount: totalAmount });
});

// POST /api/purchase-orders/:id/receive - Receive PO (add stock, bukan untuk kasir)
router.post('/:id/receive', requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const po = await db.get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]) as any;
  if (!po) return res.status(404).json({ error: 'PO not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'PO already received' });

  const actor = getActorLabel(req);
  await db.transaction(async (tx) => {
    await tx.run("UPDATE purchase_orders SET status = 'received', received_at = now() WHERE id = ?", [req.params.id]);

    const items = await tx.all('SELECT * FROM purchase_order_items WHERE po_id = ?', [req.params.id]) as any[];
    for (const item of items) {
      const qty = item.quantity;
      await tx.run('UPDATE products SET stock = stock + ?, updated_at = now() WHERE id = ?', [qty, item.product_id]);
      await tx.run('UPDATE purchase_order_items SET received_quantity = ? WHERE id = ?', [qty, item.id]);
      await tx.run(`INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, notes, created_by)
        VALUES (?, ?, 'in', ?, 'purchase', ?, ?, ?)`, [uuid(), item.product_id, qty, req.params.id, `PO Diterima: ${po.po_number}`, actor]);
    }
  });

  await recordAudit(req, { action: 'receive', entity: 'purchase_order', entity_id: req.params.id, summary: `Menerima barang pembelian ${po.po_number} (stok bertambah)` });
  return res.json({ success: true });
});

// DELETE /api/purchase-orders/:id (bukan untuk kasir)
router.delete('/:id', requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const po = await db.get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]) as any;
  if (!po) return res.status(404).json({ error: 'PO not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'Cannot delete received PO' });
  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM purchase_order_items WHERE po_id = ?', [req.params.id]);
    await tx.run('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
  });
  await recordAudit(req, { action: 'delete', entity: 'purchase_order', entity_id: req.params.id, summary: `Menghapus pembelian ${po.po_number}` });
  return res.json({ success: true });
});

export default router;
