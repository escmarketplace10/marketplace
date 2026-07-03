import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { search } = req.query;
  let query = 'SELECT * FROM suppliers WHERE 1=1';
  const params: any[] = [];
  if (search) { query += ' AND (name ILIKE ? OR contact_person ILIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY name ASC';
  return res.json(await db.all(query, params));
});

router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  return res.json(supplier);
});

router.post('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { name, contact_person, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuid();
  await db.run('INSERT INTO suppliers (id, name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)', [id, name, contact_person || null, phone || null, email || null, address || null]);
  return res.json({ success: true, id });
});

router.put('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const { name, contact_person, phone, email, address, is_active } = req.body;
  await db.run(`
    UPDATE suppliers SET name = COALESCE(?, name), contact_person = COALESCE(?, contact_person),
    phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address),
    is_active = COALESCE(?, is_active), updated_at = now() WHERE id = ?
  `, [name || null, contact_person || null, phone || null, email || null, address || null, is_active ?? null, req.params.id]);
  return res.json({ success: true });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  await db.run('UPDATE suppliers SET is_active = 0 WHERE id = ?', [req.params.id]);
  return res.json({ success: true });
});

export default router;
