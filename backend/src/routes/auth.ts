import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../database';
import sha256 from 'sha256';
import { JWT_SECRET } from '../middleware/secret';

const router = Router();

// POST /api/auth/login - Login with PIN
router.post('/login', async (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  const db = getDb();
  const hashedPin = sha256(pin);
  const employee = await db.get('SELECT * FROM employees WHERE pin = ? AND is_active = 1', [hashedPin]) as any;

  if (!employee) {
    return res.status(401).json({ error: 'PIN tidak valid' });
  }

  // Admin/owner hanya boleh login lewat Website, bukan aplikasi kasir.
  const ADMIN_ONLY_ROLES = new Set(['admin', 'owner', 'super_admin']);
  if (ADMIN_ONLY_ROLES.has(String(employee.role || ''))) {
    return res.status(403).json({ error: 'Akun admin hanya bisa login lewat Website, bukan aplikasi.' });
  }

  // JWT karyawan — diverifikasi middleware requireAuth di semua endpoint
  const token = jwt.sign(
    { kind: 'employee', id: employee.id, name: employee.name, role: employee.role },
    JWT_SECRET,
    { expiresIn: '30d' }
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
