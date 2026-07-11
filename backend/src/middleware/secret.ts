import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Secret untuk tanda tangan JWT (admin & karyawan).
 * Urutan prioritas:
 * 1. env JWT_SECRET (disarankan — set di Vercel dashboard)
 * 2. diturunkan dari DATABASE_URL (nilai rahasia yang tidak ada di repo,
 *    supaya tidak memakai konstanta hardcoded yang bisa dibaca publik)
 * 3. konstanta dev (hanya untuk pengembangan lokal tanpa .env)
 */
const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

function resolveSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  // Di produksi, JWT_SECRET WAJIB di-set. Tanpa itu, token bisa dipalsukan
  // siapa pun yang tahu konstanta dev — jadi hentikan boot, jangan diam-diam pakai fallback.
  if (isProd) {
    throw new Error('JWT_SECRET wajib di-set di environment produksi. Set JWT_SECRET di Vercel dashboard.');
  }

  if (process.env.DATABASE_URL) {
    return crypto.createHash('sha256').update('kantinku-jwt:' + process.env.DATABASE_URL).digest('hex');
  }

  console.warn('PERINGATAN: JWT_SECRET belum di-set — memakai secret dev lokal. JANGAN dipakai di produksi.');
  return 'kantinku-dev-only-secret';
}

export const JWT_SECRET: string = resolveSecret();
