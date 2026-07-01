import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kantinku-super-secret-key-2026';

// POST /api/admin/login
router.post('/login', async (req: Request, res: Response) => {
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
      { id: admin.id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: '1d' }
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

export default router;
