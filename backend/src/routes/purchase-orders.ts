import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

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
  const po = await db.all(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `, [req.params.id]) as any;
  if (!po) return res.status(404).json({ error: 'PO not found' });

  const items = await db.get(`
    SELECT poi.*, p.name as product_name, p.sku
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_id = p.id
    WHERE poi.po_id = ?
  `, [req.params.id]);

  return res.json({ ...po, items });
});

// POST /api/purchase-orders
router.post('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { supplier_id, items, notes } = req.body;
  if (!supplier_id || !items?.length) return res.status(400).json({ error: 'supplier_id and items required' });

  const id = uuid();
  const poNumber = generatePONumber();
  let totalAmount = 0;

  const doCreate = async () => {
    await db.run('INSERT INTO purchase_orders (id, po_number, supplier_id, notes) VALUES (?, ?, ?, ?)', [id, poNumber, supplier_id, notes || null]);

    for (const item of items) {
      const unitCost = item.unit_cost || 0;
      const qty = item.quantity || 1;
      const total = unitCost * qty;
      totalAmount += total;

      await db.run(`
        INSERT INTO purchase_order_items (id, po_id, product_id, quantity, unit_cost, total_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [uuid(), id, item.product_id, qty, unitCost, total]);
    }

    await db.run('UPDATE purchase_orders SET total_amount = ? WHERE id = ?', [totalAmount, id]);
  };

  doCreate();
  return res.json({ success: true, id, po_number: poNumber, total_amount: totalAmount });
});

// POST /api/purchase-orders/:id/receive - Receive PO (add stock)
router.post('/:id/receive', async (req: Request, res: Response) => {
  const db = getDb();
  const po = await db.run('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]) as any;
  if (!po) return res.status(404).json({ error: 'PO not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'PO already received' });

  const doReceive = async () => {
    await db.get("UPDATE purchase_orders SET status = 'received', received_at = datetime('now') WHERE id = ?", [req.params.id]);

    const items = await db.all('SELECT * FROM purchase_order_items WHERE po_id = ?', [req.params.id]) as any[];
    for (const item of items) {
      const qty = item.quantity;
      await db.run('UPDATE products SET stock = stock + ?, updated_at = datetime(\'now\') WHERE id = ?', [qty, item.product_id]);
      await db.run('UPDATE purchase_order_items SET received_quantity = ? WHERE id = ?', [qty, item.id]);
      await db.run(`INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, notes)
        VALUES (?, ?, 'in', ?, 'purchase', ?, ?)`, [uuid(), item.product_id, qty, req.params.id, `PO Received: ${po.po_number}`]);
    }
  };

  doReceive();
  return res.json({ success: true });
});

// DELETE /api/purchase-orders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const po = await db.all('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]) as any;
  if (!po) return res.status(404).json({ error: 'PO not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'Cannot delete received PO' });
  await db.run('DELETE FROM purchase_order_items WHERE po_id = ?', [req.params.id]);
  await db.run('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
  return res.json({ success: true });
});

export default router;
