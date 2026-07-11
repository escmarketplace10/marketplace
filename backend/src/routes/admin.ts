import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database';
import { JWT_SECRET } from '../middleware/secret';
import { loginRateLimit } from '../middleware/rateLimit';
import { recordAudit } from '../lib/audit';
import { hasPermission } from '../middleware/permissions';

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

    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password_hash);
      if (!isMatch) return res.status(401).json({ error: 'Email atau password salah' });

      // Super Admin: akses penuh.
      const token = jwt.sign(
        { kind: 'admin', id: admin.id, email: admin.email, name: admin.name, is_super: true },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      await recordAudit(req, {
        action: 'login', entity: 'admin', entity_id: admin.id,
        summary: `Super Admin "${admin.name || admin.email}" login`,
        actorKind: 'admin', actorId: admin.id,
        actorLabel: `Admin: ${admin.name || admin.email}`,
      });
      return res.json({
        token,
        user: { id: admin.id, email: admin.email, name: admin.name, is_super: true, perms: null },
      });
    }

    // Sub-admin: karyawan role 'admin' dengan email+password & izin terbatas.
    const sub = await db.get(
      "SELECT * FROM employees WHERE email = ? AND role = 'admin' AND is_active = 1",
      [email]
    ) as any;
    if (sub && sub.password_hash) {
      const isMatch = await bcrypt.compare(password, sub.password_hash);
      if (!isMatch) return res.status(401).json({ error: 'Email atau password salah' });

      const perms: string[] = Array.isArray(sub.permissions) ? sub.permissions : [];
      const token = jwt.sign(
        { kind: 'admin', id: sub.id, email: sub.email, name: sub.name, is_super: false, perms },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      await recordAudit(req, {
        action: 'login', entity: 'admin', entity_id: sub.id,
        summary: `Sub-admin "${sub.name || sub.email}" login`,
        actorKind: 'admin', actorId: sub.id,
        actorLabel: `Admin: ${sub.name || sub.email}`,
      });
      return res.json({
        token,
        user: { id: sub.id, email: sub.email, name: sub.name, is_super: false, perms },
      });
    }

    return res.status(401).json({ error: 'Email atau password salah' });
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
  await recordAudit(req, {
    action: 'password_change', entity: 'admin', entity_id: admin.id,
    summary: `Admin "${admin.name || admin.email}" mengganti password`,
    actorKind: 'admin', actorId: admin.id,
    actorLabel: `Admin: ${admin.name || admin.email}`,
  });
  return res.json({ success: true });
});

// GET /api/admin/audit-logs — riwayat aktivitas (hanya admin web)
router.get('/audit-logs', requireAdminAuth, async (req: Request, res: Response) => {
  const user = (req as any).adminUser;
  if (user?.kind !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang boleh melihat audit log.' });
  }
  // Sub-admin butuh izin 'audit-log'; super admin (is_super !== false) bebas.
  if (!hasPermission(req, 'audit-log')) {
    return res.status(403).json({ error: 'Akses ditolak: tidak memiliki izin Log Aktivitas.' });
  }

  const db = getDb();
  const { entity, action, search, start_date, end_date, limit, offset } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];
  if (entity) { query += ' AND entity = ?'; params.push(entity); }
  if (action) { query += ' AND action = ?'; params.push(action); }
  if (search) { query += ' AND (summary ILIKE ? OR actor_label ILIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (start_date) { query += ' AND created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND created_at <= ?'; params.push(end_date); }

  query += ' ORDER BY created_at DESC';
  const maxLimit = Math.min(limit ? Number(limit) : 200, 500);
  query += ' LIMIT ?'; params.push(maxLimit);
  if (offset) { query += ' OFFSET ?'; params.push(Number(offset)); }

  return res.json(await db.all(query, params));
});

export default router;
