import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/expenses
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { category, start_date, end_date, limit } = req.query;
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params: any[] = [];
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (start_date) { query += ' AND created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND created_at <= ?'; params.push(end_date); }
  query += ' ORDER BY created_at DESC';
  const maxLimit = limit ? Number(limit) : 100;
  query += ' LIMIT ?'; params.push(maxLimit);
  return res.json(await db.all(query, params));
});

// POST /api/expenses
router.post('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { category, description, amount, payment_method, reference, created_by } = req.body;
  if (!category || !amount) return res.status(400).json({ error: 'Category and amount required' });
  const id = uuid();
  await db.run('INSERT INTO expenses (id, category, description, amount, payment_method, reference, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, category, description || null, amount, payment_method || 'cash', reference || null, created_by || null]);
  return res.json({ success: true, id });
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  await db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  return res.json({ success: true });
});

export default router;
