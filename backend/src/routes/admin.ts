import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database';
import { JWT_SECRET } from '../middleware/secret';
import { loginRateLimit } from '../middleware/rateLimit';

const router = Router();

// POST /api/admin/login
router.post('/login', loginRateLimit(), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]) as any;

    if (!admin) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { kind: 'admin', id: admin.id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: admin.id, email: admin.email, name: admin.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// GET /api/admin/me (to verify token)
import { requireAdminAuth } from '../middleware/adminAuth';
router.get('/me', requireAdminAuth, (req: Request, res: Response) => {
  res.json({ user: (req as any).adminUser });
});

// POST /api/admin/change-password — wajib token admin (bukan token kasir)
router.post('/change-password', requireAdminAuth, async (req: Request, res: Response) => {
  const user = (req as any).adminUser;
  if (user?.kind !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang boleh mengganti password.' });
  }
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
  }
  if (String(new_password).length < 8) {
    return res.status(400).json({ error: 'Password baru minimal 8 karakter' });
  }

  const db = getDb();
  const admin = await db.get('SELECT * FROM admin_users WHERE id = ?', [user.id]) as any;
  if (!admin) return res.status(404).json({ error: 'Akun admin tidak ditemukan' });

  const isMatch = await bcrypt.compare(old_password, admin.password_hash);
  if (!isMatch) return res.status(401).json({ error: 'Password lama salah' });

  const hash = await bcrypt.hash(new_password, 10);
  await db.run('UPDATE admin_users SET password_hash = ?, updated_at = now() WHERE id = ?', [hash, admin.id]);
  return res.json({ success: true });
});

export default router;
