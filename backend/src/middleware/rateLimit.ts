import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiter sederhana berbasis memori untuk melawan brute-force PIN/password
 * di endpoint login. Kunci = IP.
 *
 * CATATAN: memori proses — di Vercel serverless (multi-instance/cold start) ini
 * tidak persisten. Untuk proteksi kuat di produksi, ganti store ke Redis/Upstash.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function loginRateLimit(maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();

    let b = buckets.get(ip);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, b);
    }

    b.count++;
    if (b.count > maxAttempts) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' });
    }

    next();
  };
}

// Bersihkan bucket kedaluwarsa berkala supaya memori tidak bocor (skip di serverless).
if (process.env.VERCEL !== '1') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, b] of buckets) if (now > b.resetAt) buckets.delete(ip);
  }, 60 * 1000).unref?.();
}
