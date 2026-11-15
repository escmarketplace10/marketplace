import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory: validasi req.body terhadap schema Zod.
 * Jika invalid, kembalikan 400 dengan pesan error yang jelas.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const messages = e.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return res.status(400).json({ error: 'Validasi gagal', details: messages });
      }
      next(e);
    }
  };
}
