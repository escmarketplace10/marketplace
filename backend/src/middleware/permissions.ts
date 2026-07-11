import { Request, Response, NextFunction } from 'express';

/**
 * Daftar kunci izin = satu per halaman admin yang bisa diatur super admin.
 * "employees" sengaja TIDAK ada di sini: kelola akun & hak akses hanya untuk
 * Super Admin asli (lihat requireSuperAdmin). "bantuan" selalu boleh.
 */
export const PERMISSION_KEYS = [
  'dashboard',
  'transactions',
  'laba-rugi',
  'products',
  'stocking',
  'stock-ledger',
  'suppliers',
  'purchases',
  'expenses',
  'consignors',
  'audit-log',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * Apakah token ini Super Admin (akses penuh).
 * Backward-compatible: token admin lama tidak punya field is_super — anggap
 * super (is_super !== false). Hanya sub-admin baru yang di-set is_super=false.
 */
function isSuper(auth: any): boolean {
  return auth?.kind === 'admin' && auth?.is_super !== false;
}

/**
 * Tegakkan izin halaman untuk sub-admin (token admin dengan is_super=false).
 * - Super admin & token non-admin (karyawan) diteruskan (guard lain menangani).
 * - opts.readOpen: izinkan GET tanpa cek izin — dipakai untuk data referensi
 *   (produk/kategori/supplier/penitip) yang dibaca form halaman lain sebagai
 *   dropdown, supaya form tidak rusak.
 */
export function requirePerm(key: PermissionKey, opts: { readOpen?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth;
    if (!auth || auth.kind !== 'admin') return next();
    if (isSuper(auth)) return next();
    if (opts.readOpen && req.method === 'GET') return next();
    const perms: string[] = Array.isArray(auth.perms) ? auth.perms : [];
    if (perms.includes(key)) return next();
    return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin untuk bagian ini.' });
  };
}

/**
 * Hanya Super Admin (bukan sub-admin) yang boleh. Token karyawan diteruskan
 * agar tidak mengubah perilaku aplikasi kasir; sub-admin (is_super=false) ditolak.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth;
  if (auth?.kind === 'admin' && auth?.is_super === false) {
    return res.status(403).json({ error: 'Akses ditolak: hanya Super Admin yang dapat mengelola bagian ini.' });
  }
  return next();
}

/** Cek izin di dalam handler (mis. sub-route). true bila boleh. */
export function hasPermission(req: Request, key: PermissionKey): boolean {
  const auth = (req as any).auth;
  if (!auth || auth.kind !== 'admin') return true;
  if (isSuper(auth)) return true;
  const perms: string[] = Array.isArray(auth.perms) ? auth.perms : [];
  return perms.includes(key);
}
