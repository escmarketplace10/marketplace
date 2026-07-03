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
export const JWT_SECRET: string =
  process.env.JWT_SECRET ||
  (process.env.DATABASE_URL
    ? crypto.createHash('sha256').update('kantinku-jwt:' + process.env.DATABASE_URL).digest('hex')
    : 'kantinku-dev-only-secret');

if (!process.env.JWT_SECRET) {
  console.warn('PERINGATAN: JWT_SECRET belum di-set di env — memakai secret turunan. Set JWT_SECRET di Vercel untuk keamanan maksimal.');
}
