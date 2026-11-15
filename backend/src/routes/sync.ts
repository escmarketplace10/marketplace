import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';

const router = Router();

// Whitelist entitas yang boleh disync
const ALLOWED_ENTITY_TYPES = new Set(['transaction', 'customer', 'product', 'inventory_movement']);
const ALLOWED_ACTIONS = new Set(['create', 'update', 'delete']);
const MAX_PAYLOAD_SIZE = 50 * 1024; // 50KB per item
const MAX_ITEMS_PER_PUSH = 100;

// POST /api/sync/push - Push offline data to server
router.post('/push', async (req: Request, res: Response) => {
  const db = getDb();
  const { items } = req.body;

  if (!items?.length) return res.json({ success: true, synced: 0 });

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items harus berupa array' });
  }
  if (items.length > MAX_ITEMS_PER_PUSH) {
    return res.status(400).json({ error: `Maksimal ${MAX_ITEMS_PER_PUSH} item per push` });
  }

  let synced = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { entity_type, entity_id, action, payload } = item;

    // Validasi entity_type
    if (!entity_type || !ALLOWED_ENTITY_TYPES.has(entity_type)) {
      errors.push(`Item ${i}: entity_type tidak valid (${entity_type})`);
      continue;
    }
    // Validasi action
    if (!action || !ALLOWED_ACTIONS.has(action)) {
      errors.push(`Item ${i}: action tidak valid (${action})`);
      continue;
    }
    // Validasi entity_id
    if (!entity_id || typeof entity_id !== 'string' || entity_id.length > 100) {
      errors.push(`Item ${i}: entity_id tidak valid`);
      continue;
    }
    // Validasi ukuran payload
    const payloadStr = payload ? JSON.stringify(payload) : null;
    if (payloadStr && payloadStr.length > MAX_PAYLOAD_SIZE) {
      errors.push(`Item ${i}: payload terlalu besar (maks ${MAX_PAYLOAD_SIZE / 1024}KB)`);
      continue;
    }

    await db.run(`
      INSERT INTO sync_queue (id, entity_type, entity_id, action, payload, status)
      VALUES (?, ?, ?, ?, ?, 'synced')
    `, [uuid(), entity_type, entity_id, action, payloadStr]);
    synced++;
  }

  return res.json({ success: true, synced, errors: errors.length ? errors : undefined });
});

// GET /api/sync/status - Get sync status
router.get('/status', async (_req: Request, res: Response) => {
  const db = getDb();
  const pending = await db.get("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'") as any;
  const total = await db.get("SELECT COUNT(*) as count FROM sync_queue") as any;
  return res.json({ pending: pending.count, total: total.count });
});

export default router;
