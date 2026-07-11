import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import sha256 from 'sha256';
import { requireAdminOnly } from '../middleware/roleGuard';
import { recordAudit } from '../lib/audit';

const router = Router();

// GET /api/employees
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { role, is_active } = req.query;
  let query = 'SELECT id, name, role, phone, commission_rate, is_active, created_at FROM employees WHERE 1=1';
  const params: any[] = [];
  if (role) { query += ' AND role = ?'; params.push(role); }
  if (is_active !== undefined) { query += ' AND is_active = ?'; params.push(Number(is_active)); }
  query += ' ORDER BY name ASC';
  return res.json(await db.all(query, params));
});

// GET /api/employees/:id
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const emp = await db.get('SELECT id, name, role, phone, commission_rate, is_active, created_at FROM employees WHERE id = ?', [req.params.id]);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  return res.json(emp);
});

// POST /api/employees
router.post('/', requireAdminOnly, async (req: Request, res: Response) => {
  const db = getDb();
  const { name, pin, role, phone, commission_rate } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });
  if (pin.length < 4 || pin.length > 6) return res.status(400).json({ error: 'PIN must be 4-6 digits' });

  const id = uuid();
  const hashedPin = sha256(pin);
  await db.run('INSERT INTO employees (id, name, pin, role, phone, commission_rate) VALUES (?, ?, ?, ?, ?, ?)', [id, name, hashedPin, role || 'cashier', phone || null, commission_rate || 0]);
  await recordAudit(req, { action: 'create', entity: 'employee', entity_id: id, summary: `Menambah karyawan "${name}" (${role || 'cashier'})` });
  return res.json({ success: true, id });
});

// PUT /api/employees/:id
router.put('/:id', requireAdminOnly, async (req: Request, res: Response) => {
  const db = getDb();
  const { name, pin, role, phone, commission_rate, is_active } = req.body;
  const emp = await db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]) as any;
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const hashedPin = pin ? sha256(pin) : null;
  await db.run(`
    UPDATE employees SET
      name = COALESCE(?, name),
      pin = COALESCE(?, pin),
      role = COALESCE(?, role),
      phone = COALESCE(?, phone),
      commission_rate = COALESCE(?, commission_rate),
      is_active = COALESCE(?, is_active),
      updated_at = now()
    WHERE id = ?
  `, [name || null, hashedPin, role || null, phone || null, commission_rate ?? null, is_active ?? null, req.params.id]);
  await recordAudit(req, {
    action: 'update', entity: 'employee', entity_id: req.params.id,
    summary: `Mengubah karyawan "${name ?? emp.name}"${pin ? ' (PIN diganti)' : ''}`,
  });
  return res.json({ success: true });
});

// DELETE /api/employees/:id
router.delete('/:id', requireAdminOnly, async (req: Request, res: Response) => {
  const db = getDb();
  const existing = await db.get('SELECT name FROM employees WHERE id = ?', [req.params.id]) as any;
  await db.run('UPDATE employees SET is_active = 0, updated_at = now() WHERE id = ?', [req.params.id]);
  await recordAudit(req, { action: 'delete', entity: 'employee', entity_id: req.params.id, summary: `Menonaktifkan karyawan "${existing?.name ?? req.params.id}"` });
  return res.json({ success: true });
});

export default router;
