import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../database';
import sha256 from 'sha256';
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
  let employee: any = null;

  for (const emp of employees) {
    // PIN baru (bcrypt) dimulai dengan $2a$ atau $2b$
    if (emp.pin && emp.pin.startsWith('$2')) {
      const match = await bcrypt.compare(pin, emp.pin);
      if (match) { employee = emp; break; }
    } else if (emp.pin) {
      // Legacy SHA-256 hash — cocokkan lalu migrasi ke bcrypt
      if (emp.pin === sha256(pin)) {
        employee = emp;
        // Migrasi otomatis ke bcrypt
        const bcryptPin = await bcrypt.hash(pin, 10);
        await db.run('UPDATE employees SET pin = ? WHERE id = ?', [bcryptPin, emp.id]);
        break;
      }
    }
  }

  if (!employee) {
    return res.status(401).json({ error: 'PIN tidak valid' });
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
