// Hak akses sub-admin di sisi web. Penegakan sebenarnya ada di backend;
// ini untuk menyembunyikan menu & mengarahkan halaman yang tak diizinkan.

export type Perm =
  | 'dashboard' | 'transactions' | 'laba-rugi' | 'products' | 'stocking'
  | 'stock-ledger' | 'suppliers' | 'purchases' | 'expenses' | 'consignors' | 'audit-log';

// Daftar izin yang bisa dicentang super admin (harus sama dengan backend).
// "employees" tidak ada di sini: kelola akun hanya untuk Super Admin.
export const PERMISSION_OPTIONS: { key: Perm; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'transactions', label: 'Transaksi' },
  { key: 'laba-rugi', label: 'Laba Rugi' },
  { key: 'products', label: 'Kelola Menu' },
  { key: 'stocking', label: 'Stok Barang' },
  { key: 'stock-ledger', label: 'Riwayat Stok' },
  { key: 'suppliers', label: 'Supplier' },
  { key: 'purchases', label: 'Pembelian' },
  { key: 'expenses', label: 'Biaya Operasional' },
  { key: 'consignors', label: 'Penitip / Margin' },
  { key: 'audit-log', label: 'Log Aktivitas' },
];

export function getAdminUser(): any {
  try { return JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch { return {}; }
}

// Backward-compatible: sesi lama tanpa is_super dianggap Super Admin.
export function isSuperAdmin(u: any = getAdminUser()): boolean {
  return u?.is_super !== false;
}

export function hasPerm(key: Perm, u: any = getAdminUser()): boolean {
  if (isSuperAdmin(u)) return true;
  return Array.isArray(u?.perms) && u.perms.includes(key);
}
