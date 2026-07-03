import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './secret';

/** Rute yang boleh diakses tanpa token (login & health check). */
const PUBLIC_PATHS = new Set(['/api/health', '/api/admin/login', '/api/auth/login']);

/**
 * Proteksi seluruh API publik: wajib membawa JWT valid —
 * baik token admin (login web/toko) maupun token karyawan (login PIN).
 * API ini terekspos ke internet lewat Vercel, jadi tidak boleh ada
 * endpoint data yang bisa diakses tanpa login.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Hanya proteksi API — file statis (web admin) tetap boleh diakses
  if (!req.path.startsWith('/api/')) return next();
  if (PUBLIC_PATHS.has(req.path)) return next();

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi berakhir. Silakan login ulang.' });
  }
  try {
    (req as any).auth = jwt.verify(header.slice(7), JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesi berakhir. Silakan login ulang.' });
  }
}
