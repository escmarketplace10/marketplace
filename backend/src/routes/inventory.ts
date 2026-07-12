import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { requireStockAccess, requireCashierStockAccess } from '../middleware/roleGuard';
import { getActorLabel } from '../middleware/actor';
import { requirePerm } from '../middleware/permissions';

const router = Router();

// Alasan barang keluar manual — dipetakan ke label rapi di catatan (audit trail).
const STOCK_OUT_REASONS: Record<string, string> = {
  rusak: 'Barang Rusak',
  hilang: 'Barang Hilang',
  kadaluarsa: 'Kadaluarsa',
  koreksi: 'Koreksi Stok',
  lainnya: 'Lainnya',
};

// GET /api/inventory/movements - Stock movement log (barang masuk/keluar termonitor)
router.get('/movements', requirePerm('stock-ledger'), async (req: Request, res: Response) => {
  const db = getDb();
  const { product_id, type, reference_type, start_date, end_date, limit, offset } = req.query;

  let query = `
    SELECT im.*, p.name as product_name, p.sku, p.unit
    FROM inventory_movements im
    LEFT JOIN products p ON im.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (product_id) { query += ' AND im.product_id = ?'; params.push(product_id); }
  if (type) { query += ' AND im.type = ?'; params.push(type); }
  if (reference_type) { query += ' AND im.reference_type = ?'; params.push(reference_type); }
  if (start_date) { query += ' AND im.created_at >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND im.created_at <= ?'; params.push(end_date); }

  query += ' ORDER BY im.created_at DESC';

  const maxLimit = limit ? Number(limit) : 200;
  query += ' LIMIT ?'; params.push(maxLimit);
  if (offset) { query += ' OFFSET ?'; params.push(Number(offset)); }

  return res.json(await db.all(query, params));
});

// POST /api/inventory/adjust - Manual stock adjustment (bukan untuk kasir)
router.post('/adjust', requireStockAccess, requirePerm('stocking'), async (req: Request, res: Response) => {
  const db = getDb();
  const { product_id, quantity, type, notes, reason } = req.body;

  if (!product_id || !quantity || !type) {
    return res.status(400).json({ error: 'product_id, quantity, and type required' });
  }

  const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]) as any;
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Aktor (siapa yang melakukan) diturunkan dari token JWT, bukan dari body —
  // supaya jejak audit tidak bisa dipalsukan klien.
  const actor = getActorLabel(req);
  const reasonLabel = reason && STOCK_OUT_REASONS[reason] ? `[${STOCK_OUT_REASONS[reason]}] ` : '';
  const finalNotes = `${reasonLabel}${notes || 'Penyesuaian manual'}`;

  const id = uuid();
  // Harus di-await & atomic: di serverless Vercel, respons yang terkirim duluan
  // membekukan proses — kerja yang belum selesai bisa hilang.
  await db.transaction(async (tx) => {
    if (type === 'in') {
      await tx.run('UPDATE products SET stock = stock + ?, updated_at = now() WHERE id = ?', [quantity, product_id]);
    } else if (type === 'out') {
      await tx.run('UPDATE products SET stock = stock - ?, updated_at = now() WHERE id = ?', [quantity, product_id]);
    } else if (type === 'set') {
      await tx.run('UPDATE products SET stock = ?, updated_at = now() WHERE id = ?', [quantity, product_id]);
    }

    await tx.run(`
      INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, notes, created_by)
      VALUES (?, ?, ?, ?, 'manual', ?, ?)
    `, [id, product_id, type, quantity, finalNotes, actor]);
  });

  return res.json({ success: true, id });
});

// GET /api/inventory/low-stock - Products below min_stock
router.get('/low-stock', async (_req: Request, res: Response) => {
  const db = getDb();
  const products = await db.all(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_track_stock = 1 AND p.is_active = 1 AND p.stock <= p.min_stock
    ORDER BY (p.stock - p.min_stock) ASC
  `);
  return res.json(products);
});

// POST /api/inventory/stock-opname - Quick stock take (bukan untuk kasir)
router.post('/stock-opname', requireStockAccess, requirePerm('stocking'), async (req: Request, res: Response) => {
  const db = getDb();
  const { items } = req.body; // [{product_id, actual_stock}]

  if (!items?.length) return res.status(400).json({ error: 'Items required' });

  const actor = getActorLabel(req);
  const results: any[] = [];
  await db.transaction(async (tx) => {
    for (const item of items) {
      const product = await tx.get('SELECT * FROM products WHERE id = ?', [item.product_id]) as any;
      if (!product) continue;

      const diff = item.actual_stock - product.stock;
      if (diff !== 0) {
        const type = diff > 0 ? 'in' : 'out';
        const absDiff = Math.abs(diff);

        await tx.run('UPDATE products SET stock = ?, updated_at = now() WHERE id = ?', [item.actual_stock, item.product_id]);
        await tx.run(`
          INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, notes, created_by)
          VALUES (?, ?, ?, ?, 'opname', ?, ?)
        `, [uuid(), item.product_id, type, absDiff, `Stock opname: system ${product.stock} -> actual ${item.actual_stock}`, actor]);

        results.push({ product_id: item.product_id, name: product.name, old_stock: product.stock, new_stock: item.actual_stock, diff });
      }
    }
  });

  return res.json({ success: true, adjustments: results });
});

// POST /api/inventory/transfer - Pindahkan stok gudang -> stok kasir (admin/stocking)
router.post('/transfer', requireStockAccess, requirePerm('stocking'), async (req: Request, res: Response) => {
  const db = getDb();
  const { product_id, quantity } = req.body;

  const qty = Number(quantity);
  if (!product_id || !qty || qty <= 0) {
    return res.status(400).json({ error: 'product_id dan quantity (>0) wajib diisi' });
  }

  const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]) as any;
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (Number(product.stock) < qty) {
    return res.status(400).json({ error: 'Stok gudang tidak cukup' });
  }

  const actor = getActorLabel(req);
  const refId = uuid();
  await db.transaction(async (tx) => {
    await tx.run(
      'UPDATE products SET stock = stock - ?, cashier_stock = cashier_stock + ?, updated_at = now() WHERE id = ?',
      [qty, qty, product_id]
    );
    // Dua baris ledger dengan reference_id sama: keluar dari gudang, masuk ke kasir.
    await tx.run(`
      INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, notes, created_by)
      VALUES (?, ?, 'out', ?, 'transfer', ?, 'warehouse', 'Pindah ke stok kasir', ?)
    `, [uuid(), product_id, qty, refId, actor]);
    await tx.run(`
      INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, notes, created_by)
      VALUES (?, ?, 'in', ?, 'transfer', ?, 'cashier', 'Terima dari stok gudang', ?)
    `, [uuid(), product_id, qty, refId, actor]);
  });

  return res.json({ success: true, id: refId });
});

// POST /api/inventory/cashier-opname - Opname stok kasir (kasir/stocking/admin)
router.post('/cashier-opname', requireCashierStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const { items } = req.body; // [{product_id, actual_stock}]

  if (!items?.length) return res.status(400).json({ error: 'Items required' });

  const actor = getActorLabel(req);
  const results: any[] = [];
  await db.transaction(async (tx) => {
    for (const item of items) {
      const product = await tx.get('SELECT * FROM products WHERE id = ?', [item.product_id]) as any;
      if (!product) continue;

      const oldStock = Number(product.cashier_stock);
      const diff = Number(item.actual_stock) - oldStock;
      if (diff !== 0) {
        const absDiff = Math.abs(diff);

        if (diff < 0) {
          // Stok kasir berkurang -> sisa dikembalikan ke gudang (closing).
          // cashier_stock turun, stock gudang naik senilai selisih.
          const refId = uuid();
          await tx.run(
            'UPDATE products SET cashier_stock = ?, stock = stock + ?, updated_at = now() WHERE id = ?',
            [item.actual_stock, absDiff, item.product_id]
          );
          // Dua baris ledger dengan reference_id sama: keluar dari kasir, masuk ke gudang.
          await tx.run(`
            INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, notes, created_by)
            VALUES (?, ?, 'out', ?, 'opname', ?, 'cashier', ?, ?)
          `, [uuid(), item.product_id, absDiff, refId, `Opname kasir: app ${oldStock} -> fisik ${item.actual_stock}, sisa balik ke gudang`, actor]);
          await tx.run(`
            INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, reference_id, scope, notes, created_by)
            VALUES (?, ?, 'in', ?, 'opname', ?, 'warehouse', ?, ?)
          `, [uuid(), item.product_id, absDiff, refId, `Terima balik dari stok kasir (closing)`, actor]);
        } else {
          // Stok kasir bertambah (fisik > app) -> koreksi naik, tidak menyentuh gudang.
          await tx.run('UPDATE products SET cashier_stock = ?, updated_at = now() WHERE id = ?', [item.actual_stock, item.product_id]);
          await tx.run(`
            INSERT INTO inventory_movements (id, product_id, type, quantity, reference_type, scope, notes, created_by)
            VALUES (?, ?, 'in', ?, 'opname', 'cashier', ?, ?)
          `, [uuid(), item.product_id, absDiff, `Opname kasir: app ${oldStock} -> fisik ${item.actual_stock}`, actor]);
        }

        results.push({ product_id: item.product_id, name: product.name, old_stock: oldStock, new_stock: Number(item.actual_stock), diff });
      }
    }
  });

  return res.json({ success: true, adjustments: results });
});

export default router;
