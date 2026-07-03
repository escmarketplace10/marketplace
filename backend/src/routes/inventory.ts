import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/inventory/movements - Stock movement log
router.get('/movements', async (req: Request, res: Response) => {
  const db = getDb();
  const { product_id, type, start_date, end_date, limit } = req.query;

  let query = `
    SELECT im.*, p.name as product_name, p.sku
    FROM inventory_movements im
    LEFT JOIN products p ON im.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (product_id) { query += ' AND im.product_id = ?'; params.push(product_id); }
  if (type) { query += ' AND im.type = ?'; params.push(type); }
  if (start_date) { query += ' AND im.created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND im.created_at <= ?'; params.push(end_date); }

  query += ' ORDER BY im.created_at DESC';

  const maxLimit = limit ? Number(limit) : 100;
  query += ' LIMIT ?'; params.push(maxLimit);

  return res.json(await db.all(query, params));
});

// POST /api/inventory/adjust - Manual stock adjustment
router.post('/adjust', async (req: Request, res: Response) => {
  const db = getDb();
  const { product_id, quantity, type, notes, created_by } = req.body;

  if (!product_id || !quantity || !type) {
    return res.status(400).json({ error: 'product_id, quantity, and type required' });
  }

  const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]) as any;
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const id = uuid();
  // Harus di-await & atomic: di serverless Vercel, respons yang terkirim duluan
  // membekukan proses — kerja yang belum selesai bisa hilang.
  await db.transaction(async (tx) => {
    if (type === 'in') {
      await tx.run('UPDATE products SET stock = stock + ?, updated_at = now() WHERE id = ?', [quantity, product_id]);
    } else if (type === 'out') {
      await tx.run('UPDATE products SET stock = stock - ?, updated_at = now() WHERE id = ?', [quantity, product_id]);
    } else if (type === 'set') {
      await tx.run('UPDATE products SET stock = ?, updated_at = now() WHERE id = ?', [quantity, product_id]);
    }

    await tx.run(`
      INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, notes, created_by)
      VALUES (?, ?, ?, ?, 'manual', ?, ?)
    `, [id, product_id, type, quantity, notes || 'Manual adjustment', created_by || null]);
  });

  return res.json({ success: true, id });
});

// GET /api/inventory/low-stock - Products below min_stock
router.get('/low-stock', async (_req: Request, res: Response) => {
  const db = getDb();
  const products = await db.all(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_track_stock = 1 AND p.is_active = 1 AND p.stock <= p.min_stock
    ORDER BY (p.stock - p.min_stock) ASC
  `);
  return res.json(products);
});

// POST /api/inventory/stock-opname - Quick stock take
router.post('/stock-opname', async (req: Request, res: Response) => {
  const db = getDb();
  const { items } = req.body; // [{product_id, actual_stock}]

  if (!items?.length) return res.status(400).json({ error: 'Items required' });

  const results: any[] = [];
  await db.transaction(async (tx) => {
    for (const item of items) {
      const product = await tx.get('SELECT * FROM products WHERE id = ?', [item.product_id]) as any;
      if (!product) continue;

      const diff = item.actual_stock - product.stock;
      if (diff !== 0) {
        const type = diff > 0 ? 'in' : 'out';
        const absDiff = Math.abs(diff);

        await tx.run('UPDATE products SET stock = ?, updated_at = now() WHERE id = ?', [item.actual_stock, item.product_id]);
        await tx.run(`
          INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, notes, created_by)
          VALUES (?, ?, ?, ?, 'opname', ?, ?)
        `, [uuid(), item.product_id, type, absDiff, `Stock opname: system ${product.stock} -> actual ${item.actual_stock}`, item.created_by || null]);

        results.push({ product_id: item.product_id, name: product.name, old_stock: product.stock, new_stock: item.actual_stock, diff });
      }
    }
  });

  return res.json({ success: true, adjustments: results });
});

export default router;
