import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = Router();

/** Simpan gambar base64 ke file, kembalikan path publik (mis. /uploads/<id>.jpg). */
function saveProductImage(id: string, base64: string): string | null {
  try {
    const m = /^data:image\/(\w+);base64,(.*)$/s.exec(base64);
    const data = m ? m[2] : base64;
    const ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'jpg';
    const dir = path.join(__dirname, '..', '..', 'data', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `${id}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(data, 'base64'));
    return `/uploads/${filename}`;
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
  if (search) { query += ' AND p.name LIKE ?'; params.push(`%${search}%`); }
  if (is_active !== undefined) { query += ' AND p.is_active = ?'; params.push(Number(is_active)); }

  query += ' ORDER BY p.name ASC';

  const products = await db.all(query, params);
  return res.json(products);
});

// GET /api/products/:id - Get single product with modifiers
router.get('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const product = await db.all(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [req.params.id]) as any;

  if (!product) return res.status(404).json({ error: 'Product not found' });

  const modifiers = await db.get(`
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

// POST /api/products - Create product
router.post('/', async (req: Request, res: Response) => {
  const db = getDb();
  const { category_id, name, sku, barcode, price, cost_price, unit, stock, min_stock, is_track_stock, consignor_id, commission_percent } = req.body;

  if (!category_id || !name || price === undefined) {
    return res.status(400).json({ error: 'category_id, name, and price required' });
  }

  const id = uuid();
  await db.run(`
    INSERT INTO products (id, category_id, name, sku, barcode, price, cost_price, unit, stock, min_stock, is_track_stock, consignor_id, commission_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, category_id, name, sku || null, barcode || null, price, cost_price || 0, unit || 'pcs', stock || 0, min_stock || 0, is_track_stock ?? 1, consignor_id || null, commission_percent ?? null]);

  if (req.body.image_base64) {
    const url = saveProductImage(id, req.body.image_base64);
    if (url) await db.run('UPDATE products SET image = ? WHERE id = ?', [url, id]);
  }

  return res.json({ success: true, id });
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const { name, price, cost_price, stock, min_stock, is_active, barcode, category_id, unit, consignor_id, commission_percent } = req.body;

  const existing = await db.run('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

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
      updated_at = datetime('now')
    WHERE id = ?
  `, [name || null, price ?? null, cost_price ?? null, stock ?? null, min_stock ?? null, is_active ?? null, barcode || null, category_id || null, unit || null, consignor_id ?? null, commission_percent ?? null, req.params.id]);

  if (req.body.image_base64) {
    const url = saveProductImage(req.params.id, req.body.image_base64);
    if (url) await db.run('UPDATE products SET image = ? WHERE id = ?', [url, req.params.id]);
  }

  return res.json({ success: true });
});

// DELETE /api/products/:id - Soft delete
router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  await db.run('UPDATE products SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', [req.params.id]);
  return res.json({ success: true });
});

export default router;
