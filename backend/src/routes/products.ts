import { Router, Request, Response } from 'express';
import express from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import { requireStockAccess } from '../middleware/roleGuard';
import { recordAudit } from '../lib/audit';

const router = Router();

function isSuperAdmin(req: Request): boolean {
  const auth = (req as any).auth;
  return auth?.kind === 'admin' && auth.is_super !== false;
}

function commissionSettings(body: any, existing: any, sellingPrice: number) {
  const consignorId = body.consignor_id === undefined ? (existing?.consignor_id ?? null) : (body.consignor_id || null);
  const mode = body.commission_mode === undefined ? (existing?.commission_mode || 'percent') : body.commission_mode;
  const value = mode === 'amount'
    ? Number(body.commission_amount === undefined ? existing?.commission_amount : body.commission_amount)
    : Number(body.commission_percent === undefined ? existing?.commission_percent : body.commission_percent);
  if (!consignorId) return { consignorId: null, mode: 'percent', percent: null, amount: null };
  if (!['percent', 'amount'].includes(mode) || !Number.isFinite(value) || value < 0 ||
      (mode === 'percent' && value > 100) || (mode === 'amount' && value > sellingPrice)) {
    throw new Error('Komisi harus 0-100% atau nominal Rp per item yang tidak melebihi harga jual.');
  }
  return { consignorId, mode, percent: mode === 'percent' ? value : null, amount: mode === 'amount' ? value : null };
}

// Limit lebih besar khusus route produk (upload gambar base64 ~8MB)
const largeBody = express.json({ limit: '8mb' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: SUPABASE_URL dan SUPABASE_KEY wajib di-set di environment variables.');
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    throw new Error('SUPABASE_URL dan SUPABASE_KEY wajib di-set di production.');
  }
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/** Simpan gambar base64 ke Supabase Storage, kembalikan public URL. */
async function saveProductImage(id: string, base64: string): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase belum dikonfigurasi. Set SUPABASE_URL & SUPABASE_KEY.');
    return null;
  }
  try {
    const m = /^data:image\/(\w+);base64,(.*)$/s.exec(base64);
    const data = m ? m[2] : base64;
    const ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'jpg';
    const filename = `${id}.${ext}`;
    
    const buffer = Buffer.from(data, 'base64');
    
    const { error } = await supabase
      .storage
      .from('uploads')
      .upload(filename, buffer, {
        contentType: m ? `image/${m[1]}` : 'image/jpeg',
        upsert: true
      });
      
    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }
    
    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
    return publicUrlData.publicUrl;
  } catch (e) {
    console.error('Gagal simpan gambar:', e);
    return null;
  }
}

// GET /api/products - List all products (with optional category filter)
router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { category_id, search, is_active } = req.query;

  let query = `
    SELECT p.*, c.name as category_name, c.icon as category_icon, co.name as consignor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN consignors co ON p.consignor_id = co.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category_id) { query += ' AND p.category_id = ?'; params.push(category_id); }
  if (search) { query += ' AND p.name ILIKE ?'; params.push(`%${search}%`); }
  if (is_active !== undefined) { query += ' AND p.is_active = ?'; params.push(Number(is_active)); }

  query += ' ORDER BY p.name ASC';

  const products = await db.all(query, params);
  if ((req as any).auth?.role === 'waiter' && (req as any).auth?.kind === 'employee') {
    return res.json(products.map((p: any) => ({
      id: p.id, category_id: p.category_id, name: p.name, price: p.price,
      unit: p.unit, image: p.image, is_active: p.is_active,
      is_track_stock: p.is_track_stock, cashier_stock: p.cashier_stock,
      min_stock: p.min_stock, category_name: p.category_name, category_icon: p.category_icon,
    })));
  }
  return res.json(products);
});

// GET /api/products/:id - Get single product with modifiers
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const product = await db.get(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [req.params.id]) as any;

  if (!product) return res.status(404).json({ error: 'Product not found' });

  const modifiers = await db.all(`
    SELECT pm.*, mo.id as option_id, mo.name as option_name, mo.price as option_price
    FROM product_modifiers pm
    LEFT JOIN modifier_options mo ON mo.modifier_id = pm.id
    WHERE pm.product_id = ?
  `, [req.params.id]);

  // Group modifiers
  const modifierMap = new Map();
  for (const row of modifiers as any[]) {
    if (!modifierMap.has(row.id)) {
      modifierMap.set(row.id, {
        id: row.id,
        name: row.name,
        type: row.type,
        options: []
      });
    }
    if (row.option_id) {
      modifierMap.get(row.id).options.push({
        id: row.option_id,
        name: row.option_name,
        price: row.option_price
      });
    }
  }

  return res.json({
    ...product,
    modifiers: Array.from(modifierMap.values())
  });
});

// POST /api/products - Create product (bukan untuk kasir)
router.post('/', largeBody, requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const { category_id, name, sku, barcode, price, cost_price, unit, stock, min_stock, is_track_stock, consignor_id } = req.body;

  if (!category_id || !name || price === undefined) {
    return res.status(400).json({ error: 'category_id, name, and price required' });
  }
  if ((consignor_id || req.body.commission_mode !== undefined || req.body.commission_percent !== undefined || req.body.commission_amount !== undefined) && !isSuperAdmin(req)) return res.status(403).json({ error: 'Hanya SuperAdmin yang dapat mengatur margin barang titipan.' });
  let commission;
  try { commission = commissionSettings(req.body, null, Number(price)); }
  catch (e) { return res.status(400).json({ error: (e as Error).message }); }

  const id = uuid();
  await db.run(`
    INSERT INTO products (id, category_id, name, sku, barcode, price, cost_price, unit, stock, min_stock, is_track_stock,
      consignor_id, commission_percent, commission_mode, commission_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, category_id, name, sku || null, barcode || null, price, cost_price || 0, unit || 'pcs', stock || 0,
    min_stock || 0, is_track_stock ?? 1, commission.consignorId, commission.percent, commission.mode, commission.amount]);

  if (req.body.image_base64) {
    const url = await saveProductImage(id, req.body.image_base64);
    if (url) await db.run('UPDATE products SET image = ? WHERE id = ?', [url, id]);
  }

  await recordAudit(req, { action: 'create', entity: 'product', entity_id: id, summary: `Menambah produk "${name}"` });
  return res.json({ success: true, id });
});

// PUT /api/products/:id - Update product (bukan untuk kasir)
router.put('/:id', largeBody, requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const { name, price, cost_price, stock, min_stock, is_active, barcode, category_id, unit } = req.body;

  const existing = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const commissionFields = ['consignor_id', 'commission_mode', 'commission_percent', 'commission_amount'];
  const changesCommission = commissionFields.some(key => req.body[key] !== undefined && String(req.body[key] ?? '') !== String((existing as any)[key] ?? ''));
  if (changesCommission && !isSuperAdmin(req)) return res.status(403).json({ error: 'Hanya SuperAdmin yang dapat mengatur margin barang titipan.' });
  let commission;
  try { commission = commissionSettings(req.body, existing, Number(price ?? (existing as any).price)); }
  catch (e) { return res.status(400).json({ error: (e as Error).message }); }

  await db.run(`
    UPDATE products SET
      name = COALESCE(?, name),
      price = COALESCE(?, price),
      cost_price = COALESCE(?, cost_price),
      stock = COALESCE(?, stock),
      min_stock = COALESCE(?, min_stock),
      is_active = COALESCE(?, is_active),
      barcode = COALESCE(?, barcode),
      category_id = COALESCE(?, category_id),
      unit = COALESCE(?, unit),
      consignor_id = ?,
      commission_percent = ?,
      commission_mode = ?,
      commission_amount = ?,
      updated_at = now()
    WHERE id = ?
  `, [name || null, price ?? null, cost_price ?? null, stock ?? null, min_stock ?? null, is_active ?? null,
    barcode || null, category_id || null, unit || null, commission.consignorId, commission.percent,
    commission.mode, commission.amount, req.params.id]);

  if (req.body.image_base64) {
    const url = await saveProductImage(req.params.id, req.body.image_base64);
    if (url) await db.run('UPDATE products SET image = ? WHERE id = ?', [url, req.params.id]);
  }

  await recordAudit(req, {
    action: 'update', entity: 'product', entity_id: req.params.id,
    summary: `Mengubah produk "${name || (existing as any).name}"`,
  });
  return res.json({ success: true });
});

// DELETE /api/products/:id - Soft delete (bukan untuk kasir)
router.delete('/:id', requireStockAccess, async (req: Request, res: Response) => {
  const db = getDb();
  const existing = await db.get('SELECT name FROM products WHERE id = ?', [req.params.id]) as any;
  await db.run('UPDATE products SET is_active = 0, updated_at = now() WHERE id = ?', [req.params.id]);
  await recordAudit(req, {
    action: 'delete', entity: 'product', entity_id: req.params.id,
    summary: `Menghapus produk "${existing?.name ?? req.params.id}"`,
  });
  return res.json({ success: true });
});

export default router;
