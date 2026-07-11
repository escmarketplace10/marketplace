import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { recordAudit } from '../lib/audit';

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
  await recordAudit(req, { action: 'create', entity: 'expense', entity_id: id, summary: `Mencatat biaya ${category} sebesar Rp${Number(amount).toLocaleString('id-ID')}` });
  return res.json({ success: true, id });
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const existing = await db.get('SELECT category, amount FROM expenses WHERE id = ?', [req.params.id]) as any;
  await db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  await recordAudit(req, {
    action: 'delete', entity: 'expense', entity_id: req.params.id,
    summary: existing ? `Menghapus biaya ${existing.category} (Rp${Number(existing.amount).toLocaleString('id-ID')})` : `Menghapus biaya ${req.params.id}`,
  });
  return res.json({ success: true });
});

export default router;
