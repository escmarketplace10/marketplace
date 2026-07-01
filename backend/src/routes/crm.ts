import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/crm/points-history/:customer_id
router.get('/points-history/:customer_id', async (req: Request, res: Response) => {
  const db = getDb();
  const history = await db.all(`
    SELECT lph.*, t.receipt_number
    FROM loyalty_points_history lph
    LEFT JOIN transactions t ON lph.transaction_id = t.id
    WHERE lph.customer_id = ?
    ORDER BY lph.created_at DESC
    LIMIT 50
  `, [req.params.customer_id]);
  return res.json(history);
});

// GET /api/crm/redeem-points - Redeem customer points
router.post('/redeem-points', async (req: Request, res: Response) => {
  const db = getDb();
  const { customer_id, points, transaction_id } = req.body;
  if (!customer_id || !points) return res.status(400).json({ error: 'customer_id and points required' });

  const customer = await db.all('SELECT * FROM customers WHERE id = ?', [customer_id]) as any;
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  if (customer.points < points) return res.status(400).json({ error: 'Insufficient points' });

  const doRedeem = async () => {
    await db.run('UPDATE customers SET points = points - ?, updated_at = datetime(\'now\') WHERE id = ?', [points, customer_id]);
    await db.run(`INSERT INTO loyalty_points_history (id, customer_id, points, type, transaction_id, description)
      VALUES (?, ?, ?, 'redeem', ?, ?)`, [uuid(), customer_id, points, transaction_id || null, 'Points redeemed']);
  };

  doRedeem();
  return res.json({ success: true, remaining_points: customer.points - points });
});

// GET /api/crm/membership-tiers - Get stats per tier
router.get('/membership-tiers', async (_req: Request, res: Response) => {
  const db = getDb();
  const tiers = await db.all(`
    SELECT membership_tier, COUNT(*) as count, COALESCE(SUM(total_spent), 0) as total_spent
    FROM customers
    GROUP BY membership_tier
    ORDER BY CASE membership_tier WHEN 'Platinum' THEN 1 WHEN 'Gold' THEN 2 WHEN 'Silver' THEN 3 ELSE 4 END
  `);
  return res.json(tiers);
});

export default router;
