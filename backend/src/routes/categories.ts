import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { requireStockAccess } from '../middleware/roleGuard';

const router = Router();

// GET /api/categories - List all categories
router.get('/', async (_req: Request, res: Response) => {
  const db = getDb();
  const categories = await db.all(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `);
  return res.json(categories);
});

// POST /api/categories - Create category (bukan untuk kasir)
router.post('/', requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const { name, icon, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = uuid();
  await db.run('INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)', [id, name, icon || '📦', sort_order || 0]);
  return res.json({ success: true, id });
});

// PUT /api/categories/:id (bukan untuk kasir)
router.put('/:id', requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const { name, icon, sort_order } = req.body;
  await db.run('UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), sort_order = COALESCE(?, sort_order), updated_at = now() WHERE id = ?', [name || null, icon || null, sort_order ?? null, req.params.id]);
  return res.json({ success: true });
});

// DELETE /api/categories/:id (bukan untuk kasir)
router.delete('/:id', requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  // Check if products exist in this category
  const productCount = await db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]) as any;
  if (productCount.count > 0) {
    return res.status(400).json({ error: 'Cannot delete category with existing products. Move products first.' });
  }
  await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  return res.json({ success: true });
});

export default router;
