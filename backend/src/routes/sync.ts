import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

// POST /api/sync/push - Push offline data to server
router.post('/push', async (req: Request, res: Response) => {
  const db = getDb();
  const { items } = req.body;

  if (!items?.length) return res.json({ success: true, synced: 0 });

  let synced = 0;
  for (const item of items) {
    const { entity_type, entity_id, action, payload } = item;
    // Store in sync queue for processing
    await db.run(`
      INSERT INTO sync_queue (id, entity_type, entity_id, action, payload, status)
      VALUES (?, ?, ?, ?, ?, 'synced')
    `, [uuid(), entity_type, entity_id, action, JSON.stringify(payload)]);
    synced++;
  }

  return res.json({ success: true, synced });
});

// GET /api/sync/status - Get sync status
router.get('/status', async (_req: Request, res: Response) => {
  const db = getDb();
  const pending = await db.get("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'") as any;
  const total = await db.get("SELECT COUNT(*) as count FROM sync_queue") as any;
  return res.json({ pending: pending.count, total: total.count });
});

export default router;
