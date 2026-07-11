import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import sha256 from 'sha256';
import bcrypt from 'bcryptjs';
import { requireAdminOnly } from '../middleware/roleGuard';
import { recordAudit } from '../lib/audit';
import { PERMISSION_KEYS } from '../middleware/permissions';

const router = Router();

// Bersihkan daftar izin dari klien: hanya kunci yang dikenal yang disimpan.
function cleanPerms(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((k) => (PERMISSION_KEYS as readonly string[]).includes(k));
}

// Cek email belum dipakai admin lain (di admin_users maupun employees).
async function emailTaken(db: any, email: string, exceptEmployeeId?: string): Promise<boolean> {
  const inAdmin = await db.get('SELECT id FROM admin_users WHERE email = ?', [email]);
  if (inAdmin) return true;
  const inEmp = await db.get('SELECT id FROM employees WHERE email = ? AND id != ?', [email, exceptEmployeeId || '']);
  return !!inEmp;
}

// GET /api/employees — password_hash TIDAK pernah dikirim ke klien.
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { role, is_active } = req.query;
  let query = 'SELECT id, name, role, phone, commission_rate, is_active, email, permissions, created_at FROM employees WHERE 1=1';
  const params: any[] = [];
  if (role) { query += ' AND role = ?'; params.push(role); }
  if (is_active !== undefined) { query += ' AND is_active = ?'; params.push(Number(is_active)); }
  query += ' ORDER BY name ASC';
  return res.json(await db.all(query, params));
});

// GET /api/employees/:id
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const emp = await db.get('SELECT id, name, role, phone, commission_rate, is_active, email, permissions, created_at FROM employees WHERE id = ?', [req.params.id]);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  return res.json(emp);
});

// POST /api/employees
router.post('/', requireAdminOnly, async (req: Request, res: Response) => {
  const db = getDb();
  const { name, pin, role, phone, commission_rate, email, password, permissions } = req.body;
  const r = role || 'cashier';
  if (!name) return res.status(400).json({ error: 'Nama wajib diisi' });

  const id = uuid();

  if (r === 'admin') {
    // Sub-admin: login web pakai email+password (bukan PIN) + daftar izin halaman.
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib untuk role Admin' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter' });
    if (await emailTaken(db, email)) return res.status(400).json({ error: 'Email sudah dipakai akun lain' });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const perms = cleanPerms(permissions);
    await db.run(
      'INSERT INTO employees (id, name, role, phone, commission_rate, email, password_hash, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, 'admin', phone || null, commission_rate || 0, email, passwordHash, JSON.stringify(perms)]
    );
    await recordAudit(req, { action: 'create', entity: 'employee', entity_id: id, summary: `Menambah sub-admin "${name}" (${perms.length} izin)` });
    return res.json({ success: true, id });
  }

  // Kasir / Petugas Stok: pakai PIN.
  if (!pin) return res.status(400).json({ error: 'PIN wajib diisi' });
  if (pin.length < 4 || pin.length > 6) return res.status(400).json({ error: 'PIN harus 4-6 digit' });
  const hashedPin = sha256(pin);
  await db.run('INSERT INTO employees (id, name, pin, role, phone, commission_rate) VALUES (?, ?, ?, ?, ?, ?)', [id, name, hashedPin, r, phone || null, commission_rate || 0]);
  await recordAudit(req, { action: 'create', entity: 'employee', entity_id: id, summary: `Menambah karyawan "${name}" (${r})` });
  return res.json({ success: true, id });
});

// PUT /api/employees/:id
router.put('/:id', requireAdminOnly, async (req: Request, res: Response) => {
  const db = getDb();
  const { name, pin, role, phone, commission_rate, is_active, email, password, permissions } = req.body;
  const emp = await db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]) as any;
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const effectiveRole = role || emp.role;
  if (email && email !== emp.email && await emailTaken(db, email, req.params.id)) {
    return res.status(400).json({ error: 'Email sudah dipakai akun lain' });
  }
  if (password && String(password).length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter' });
  }

  const hashedPin = pin ? sha256(pin) : null;
  const passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
  // permissions hanya relevan untuk role admin; kalau dikirim, timpa.
  const permsJson = permissions !== undefined ? JSON.stringify(cleanPerms(permissions)) : null;

  await db.run(`
    UPDATE employees SET
      name = COALESCE(?, name),
      pin = COALESCE(?, pin),
      role = COALESCE(?, role),
      phone = COALESCE(?, phone),
      commission_rate = COALESCE(?, commission_rate),
      is_active = COALESCE(?, is_active),
      email = COALESCE(?, email),
      password_hash = COALESCE(?, password_hash),
      permissions = COALESCE(?, permissions),
      updated_at = now()
    WHERE id = ?
  `, [name || null, hashedPin, role || null, phone || null, commission_rate ?? null, is_active ?? null, email || null, passwordHash, permsJson, req.params.id]);

  const changes = [pin ? 'PIN diganti' : null, password ? 'password diganti' : null, permissions !== undefined ? 'izin diperbarui' : null].filter(Boolean).join(', ');
  await recordAudit(req, {
    action: 'update', entity: 'employee', entity_id: req.params.id,
    summary: `Mengubah ${effectiveRole === 'admin' ? 'sub-admin' : 'karyawan'} "${name ?? emp.name}"${changes ? ` (${changes})` : ''}`,
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
