import { Request, Response, NextFunction } from 'express';

export function restrictWaiter(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth;
  if (auth?.kind !== 'employee' || auth.role !== 'waiter') return next();
  const path = req.path;
  const allowed =
    (req.method === 'GET' && (path === '/api/health' || path === '/api/products' || path === '/api/categories' || path === '/api/transactions' || /^\/api\/transactions\/[^/]+$/.test(path))) ||
    (req.method === 'POST' && path === '/api/transactions');
  if (allowed) return next();
  return res.status(403).json({ error: 'Akun waiter hanya dapat membuat dan melihat pesanan miliknya.' });
}
