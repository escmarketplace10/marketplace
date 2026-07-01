import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config();

let pool: Pool;

export function getDb() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.warn("WARNING: DATABASE_URL is not set in .env! Database connection might fail.");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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
  `);
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
