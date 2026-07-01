import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import sha256 from 'sha256';

const router = Router();

// POST /api/auth/login - Login with PIN
router.post('/login', async (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  const db = getDb();
  const hashedPin = sha256(pin);
  const employee = await db.get('SELECT * FROM employees WHERE pin = ? AND is_active = 1', [hashedPin]) as any;

  if (!employee) {
    return res.status(401).json({ error: 'PIN tidak valid' });
  }

  // Generate simple token
  const token = sha256(employee.id + Date.now());

  return res.json({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      phone: employee.phone
    }
  });
});

// POST /api/auth/register - Register new employee (for initial setup)
router.post('/register', async (req: Request, res: Response) => {
  const { name, pin, role, phone } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });

  if (pin.length < 4 || pin.length > 6) {
    return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  }

  const db = getDb();
  const id = uuid();
  const hashedPin = sha256(pin);

  await db.run(`
    INSERT INTO employees (id, name, pin, role, phone)
    VALUES (?, ?, ?, ?, ?)
  `, [id, name, hashedPin, role || 'cashier', phone || null]);

  return res.json({ success: true, id });
});

export default router;
