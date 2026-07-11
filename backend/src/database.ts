import { Pool, types } from 'pg';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Driver pg mengembalikan NUMERIC/BIGINT sebagai string — parse jadi angka
// supaya SUM/COUNT/harga tidak berubah jadi string di respons JSON.
types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC
types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT (hasil COUNT)

let pool: Pool;

export function getDb() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.warn("WARNING: DATABASE_URL is not set in .env! Database connection might fail.");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined
    });
  }

  return {
    async get(sql: string, params: any[] = []) {
      const { query, values } = convertSqlAndParams(sql, params);
      const res = await pool.query(query, values);
      return res.rows[0];
    },
    async all(sql: string, params: any[] = []) {
      const { query, values } = convertSqlAndParams(sql, params);
      const res = await pool.query(query, values);
      return res.rows;
    },
    async run(sql: string, params: any[] = []) {
      const { query, values } = convertSqlAndParams(sql, params);
      await pool.query(query, values);
      return { success: true };
    },
    async transaction(callback: (client: any) => Promise<void>) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const txDb = {
          async get(sql: string, params: any[] = []) {
            const { query, values } = convertSqlAndParams(sql, params);
            const res = await client.query(query, values);
            return res.rows[0];
          },
          async all(sql: string, params: any[] = []) {
            const { query, values } = convertSqlAndParams(sql, params);
            const res = await client.query(query, values);
            return res.rows;
          },
          async run(sql: string, params: any[] = []) {
            const { query, values } = convertSqlAndParams(sql, params);
            await client.query(query, values);
            return { success: true };
          }
        };
        await callback(txDb);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  };
}

export async function initializeSchema() {
  const db = getDb();
  await db.run(`
    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT,
      price NUMERIC NOT NULL DEFAULT 0,
      cost_price NUMERIC DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      stock NUMERIC DEFAULT 0,
      min_stock NUMERIC DEFAULT 0,
      image TEXT,
      is_active INTEGER DEFAULT 1,
      is_track_stock INTEGER DEFAULT 1,
      consignor_id TEXT,
      commission_percent NUMERIC,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Product Modifiers / Variants
    CREATE TABLE IF NOT EXISTS product_modifiers (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'select'
    );

    CREATE TABLE IF NOT EXISTS modifier_options (
      id TEXT PRIMARY KEY,
      modifier_id TEXT NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price NUMERIC DEFAULT 0
    );

    -- Customers (CRM)
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      birthday TEXT,
      points NUMERIC DEFAULT 0,
      total_spent NUMERIC DEFAULT 0,
      visit_count INTEGER DEFAULT 0,
      membership_tier TEXT DEFAULT 'Silver',
      deposit_balance NUMERIC DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Employees
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT DEFAULT 'cashier',
      phone TEXT,
      commission_rate NUMERIC DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Admin Users
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Transactions (Orders)
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      receipt_number TEXT NOT NULL,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      customer_id TEXT REFERENCES customers(id),
      order_type TEXT DEFAULT 'dine_in',
      order_reference TEXT,
      subtotal NUMERIC DEFAULT 0,
      discount_total NUMERIC DEFAULT 0,
      tax_total NUMERIC DEFAULT 0,
      grand_total NUMERIC DEFAULT 0,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      cash_amount NUMERIC,
      change_amount NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      is_void INTEGER DEFAULT 0,
      void_reason TEXT,
      void_by TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Transaction Items
    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity NUMERIC DEFAULT 1,
      unit_price NUMERIC DEFAULT 0,
      discount_amount NUMERIC DEFAULT 0,
      total_price NUMERIC DEFAULT 0,
      modifier_details TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending'
    );

    -- Inventory Movements
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      type TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Purchase Orders
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      status TEXT DEFAULT 'draft',
      total_amount NUMERIC DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      received_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity NUMERIC DEFAULT 1,
      unit_cost NUMERIC DEFAULT 0,
      total_cost NUMERIC DEFAULT 0,
      received_quantity NUMERIC DEFAULT 0
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT,
      amount NUMERIC NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      reference TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    -- Consignors
    CREATE TABLE IF NOT EXISTS consignors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );

    -- Consignment Settlements
    CREATE TABLE IF NOT EXISTS consignment_settlements (
      id TEXT PRIMARY KEY,
      consignor_id TEXT NOT NULL REFERENCES consignors(id),
      period_start TIMESTAMP,
      period_end TIMESTAMP NOT NULL,
      total_sales NUMERIC DEFAULT 0,
      commission_amount NUMERIC DEFAULT 0,
      payable_amount NUMERIC DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    -- Loyalty Points History
    CREATE TABLE IF NOT EXISTS loyalty_points_history (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      points NUMERIC NOT NULL,
      type TEXT NOT NULL,
      transaction_id TEXT REFERENCES transactions(id),
      description TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    -- Sync Queue (Offline Mode)
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT now()
    );

    -- Audit log: catat siapa mengubah apa & kapan (aksi admin/petugas di panel).
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT now(),
      actor_kind TEXT,          -- admin / employee / system
      actor_id TEXT,
      actor_label TEXT,         -- label terbaca manusia (dari JWT, bukan body)
      action TEXT NOT NULL,     -- create / update / delete / void / login / password_change
      entity TEXT NOT NULL,     -- product / supplier / employee / expense / transaction / ...
      entity_id TEXT,
      summary TEXT,             -- ringkasan terbaca: "Menambah produk Kopi Susu"
      meta JSONB
    );
    CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity);

    -- Sub-admin: karyawan dengan role 'admin' login ke web pakai email+password
    -- (bukan PIN) dan punya daftar izin halaman. Kolom ditambah ke tabel employees.
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS permissions JSONB;
    -- Sub-admin login pakai email+password, bukan PIN — PIN jadi boleh kosong.
    ALTER TABLE employees ALTER COLUMN pin DROP NOT NULL;
  `);

  // Ensure default admin exists
  try {
    const adminCount = await db.get('SELECT COUNT(*) as count FROM admin_users');
    if (!adminCount || parseInt(adminCount.count) === 0) {
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@kantinku.com';
      // Password default TIDAK boleh hardcoded. Ambil dari env; kalau kosong,
      // buat acak dan cetak SEKALI supaya wajib diganti admin.
      const envPass = process.env.DEFAULT_ADMIN_PASSWORD;
      const password = envPass || crypto.randomBytes(12).toString('base64url');
      const passwordHash = await bcrypt.hash(password, 10);
      await db.run(
        'INSERT INTO admin_users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
        ['admin_web_1', email, passwordHash, 'Super Admin']
      );
      if (envPass) {
        console.log(`Default admin created: ${email} (password dari DEFAULT_ADMIN_PASSWORD)`);
      } else {
        console.log('=================================================================');
        console.log(`Default admin created: ${email}`);
        console.log(`GENERATED PASSWORD (login lalu SEGERA ganti): ${password}`);
        console.log('Set DEFAULT_ADMIN_PASSWORD di env untuk menghindari password acak.');
        console.log('=================================================================');
      }
    }
  } catch (e) {
    console.error('Failed to auto-seed admin:', e);
  }
}

export async function closeDb() {
  if (pool) {
    await pool.end();
  }
}

/**
 * Converts a query using ? placeholders to Postgres $1, $2 format.
 * Returns the converted query and the parameters.
 */
function convertSqlAndParams(sql: string, params: any[]) {
  let paramIndex = 1;
  const newSql = sql.replace(/\?/g, () => "$" + (paramIndex++));
  return { query: newSql, values: params };
}
