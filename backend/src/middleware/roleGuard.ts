import { Request, Response, NextFunction } from 'express';

/**
 * Batasi endpoint yang mengubah stok/menu ke peran yang berwenang.
 * - Token admin web (kind: 'admin')  → selalu boleh.
 * - Token karyawan (kind: 'employee') → hanya role 'stocking'
 *   (atau peran admin lama untuk kompatibilitas data lama).
 * - Kasir → 403.
 *
 * requireAuth WAJIB dipasang lebih dulu (mengisi req.auth dari JWT).
 */
const STOCK_ROLES = new Set(['stocking', 'admin', 'owner', 'super_admin']);

export function requireStockAccess(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth;
  if (!auth) return res.status(401).json({ error: 'Sesi berakhir. Silakan login ulang.' });
  if (auth.kind === 'admin') return next();
  if (STOCK_ROLES.has(String(auth.role || ''))) return next();
  return res.status(403).json({ error: 'Akses ditolak: kasir tidak dapat mengatur stok atau menu.' });
}

/**
 * Void transaksi mengembalikan stok & mengubah catatan keuangan — hanya
 * boleh dilakukan Admin lewat Website (bukan kasir/petugas stok lewat aplikasi).
 */
export function requireAdminOnly(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth;
  if (!auth) return res.status(401).json({ error: 'Sesi berakhir. Silakan login ulang.' });
  if (auth.kind === 'admin') return next();
  return res.status(403).json({ error: 'Akses ditolak: hanya Admin yang bisa melakukan ini lewat Website.' });
}
