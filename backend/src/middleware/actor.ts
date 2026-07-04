import { Request } from 'express';

/**
 * Label aktor yang bisa dibaca manusia, diturunkan dari JWT (req.auth) —
 * BUKAN dari body request, supaya tidak bisa dipalsukan klien.
 * Dipakai untuk kolom audit (created_by / void_by) di inventory_movements & transactions.
 */
export function getActorLabel(req: Request): string {
  const auth = (req as any).auth;
  if (!auth) return 'Sistem';
  if (auth.kind === 'admin') return `Admin: ${auth.name || auth.email || auth.id}`;
  if (auth.kind === 'employee') return `${auth.name || 'Karyawan'} (${auth.role || 'cashier'})`;
  return 'Sistem';
}
