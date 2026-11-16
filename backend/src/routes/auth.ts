import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../database';
import { matchesPin } from '../lib/pin';
import { JWT_SECRET } from '../middleware/secret';
import { loginRateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { loginPinSchema } from '../lib/schemas';

const router = Router();

// PIN 4-6 digit — sekarang di-hash bcrypt (migrasi dari SHA-256).
// POST /api/auth/login - Login with PIN
router.post('/login', loginRateLimit(), validate(loginPinSchema), async (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required' });
  if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN harus 4-6 digit angka' });

  const db = getDb();

  // Cari karyawan aktif — coba bcrypt dulu, fallback ke SHA-256 (legacy) lalu migrasi.
  const employees = await db.all('SELECT * FROM employees WHERE is_active = 1 AND pin IS NOT NULL') as any[];
  const matches: any[] = [];
  for (const emp of employees) {
    if (await matchesPin(pin, emp.pin)) matches.push(emp);
  }

  if (matches.length > 1) {
    return res.status(409).json({ error: 'PIN dipakai lebih dari satu akun. Minta SuperAdmin mengganti PIN tiap anggota.' });
  }
  const employee = matches[0];

  if (!employee) {
    return res.status(401).json({ error: 'PIN tidak valid' });
  }

  if (employee.pin && !employee.pin.startsWith('$2')) {
    const bcryptPin = await bcrypt.hash(pin, 10);
    await db.run('UPDATE employees SET pin = ? WHERE id = ?', [bcryptPin, employee.id]);
  }

  // Admin/owner hanya boleh login lewat Website, bukan aplikasi kasir.
  const ADMIN_ONLY_ROLES = new Set(['admin', 'owner', 'super_admin']);
  if (ADMIN_ONLY_ROLES.has(String(employee.role || ''))) {
    return res.status(403).json({ error: 'Akun admin hanya bisa login lewat Website, bukan aplikasi.' });
  }

  // JWT karyawan — masa berlaku pendek untuk meminimalkan dampak token bocor.
  const token = jwt.sign(
    { kind: 'employee', id: employee.id, name: employee.name, role: employee.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  return res.json({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      phone: employee.phone
    }
  });
});

// Catatan: endpoint /register lama DIHAPUS — dulu publik tanpa auth sehingga
// siapa pun di internet bisa membuat akun ber-role admin. Pembuatan karyawan
// kini hanya lewat POST /api/employees (terproteksi token).

export default router;
