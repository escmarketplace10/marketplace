import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/customers - List all customers
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { search, phone } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];

  if (search) { query += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (phone) { query += ' AND phone = ?'; params.push(phone); }

  query += ' ORDER BY name ASC';
  const customers = await db.all(query, params);
  return res.json(customers);
});

// GET /api/customers/:id
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  return res.json(customer);
});

// POST /api/customers - Create or find by phone
router.post('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { name, phone, email, birthday } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  // If phone provided, check existing
  if (phone) {
    const existing = await db.get('SELECT * FROM customers WHERE phone = ?', [phone]) as any;
    if (existing) {
      await db.run('UPDATE customers SET visit_count = visit_count + 1, updated_at = datetime(\'now\') WHERE id = ?', [existing.id]);
      return res.json(existing);
    }
  }

  const id = uuid();
  await db.run(`
    INSERT INTO customers (id, name, phone, email, birthday)
    VALUES (?, ?, ?, ?, ?)
  `, [id, name, phone || null, email || null, birthday || null]);

  return res.json({ success: true, id });
});

// PUT /api/customers/:id
router.put('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const { name, phone, email, birthday, notes } = req.body;
  await db.run(`
    UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      birthday = COALESCE(?, birthday),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
    WHERE id = ?
  `, [name || null, phone || null, email || null, birthday || null, notes || null, req.params.id]);
  return res.json({ success: true });
});

// POST /api/customers/:id/deposit - Add deposit balance
router.post('/:id/deposit', async (req: Request, res: Response) => {
  const db = getDb();
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

  await db.run('UPDATE customers SET deposit_balance = deposit_balance + ?, updated_at = datetime(\'now\') WHERE id = ?', [amount, req.params.id]);
  return res.json({ success: true });
});

export default router;
