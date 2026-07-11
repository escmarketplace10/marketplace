import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { requirePerm } from '../middleware/permissions';

const router = Router();

// GET /api/dashboard/summary - Today's overview
router.get('/summary', requirePerm('dashboard'), async (_req: Request, res: Response) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const sales = await db.get(`
    SELECT
      COALESCE(COUNT(*), 0) as transaction_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(AVG(grand_total), 0) as avg_basket
    FROM transactions
    WHERE created_at::date = ? AND is_void = 0
  `, [today]) as any;

  const topProducts = await db.all(`
    SELECT ti.product_id, ti.product_name, SUM(ti.quantity) as qty, SUM(ti.total_price) as total
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    WHERE t.created_at::date = ? AND t.is_void = 0
    GROUP BY ti.product_id, ti.product_name
    ORDER BY qty DESC
    LIMIT 10
  `, [today]);

  const lowStock = await db.get(`
    SELECT COUNT(*) as count FROM products
    WHERE is_track_stock = 1 AND is_active = 1 AND stock <= min_stock
  `) as any;

  const employees = await db.get("SELECT COUNT(*) as count FROM employees WHERE is_active = 1") as any;
  const customers = await db.get("SELECT COUNT(*) as count FROM customers") as any;

  return res.json({
    // Bentuk nested — dipakai aplikasi Flutter (dashboard_screen.dart)
    sales,
    topProducts,
    alerts: { low_stock: lowStock.count },
    counts: { employees: employees.count, customers: customers.count },
    // Alias flat — dipakai web admin (Dashboard.tsx)
    today_revenue: sales.total_sales,
    today_transactions: sales.transaction_count,
    total_customers: customers.count,
    low_stock_count: lowStock.count
  });
});

// GET /api/dashboard/sales-chart - Sales data for charts
router.get('/sales-chart', requirePerm('dashboard'), async (req: Request, res: Response) => {
  const db = getDb();
  const { period, start_date, end_date } = req.query;
  const days = period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 7;

  const startDate = start_date || new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const data = await db.all(`
    SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM transactions
    WHERE created_at::date >= ? AND created_at::date <= ? AND is_void = 0
    GROUP BY to_char(created_at, 'YYYY-MM-DD')
    ORDER BY date ASC
  `, [startDate, endDate]);

  return res.json(data);
});

// GET /api/dashboard/payment-methods
router.get('/payment-methods', requirePerm('dashboard'), async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date().toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const data = await db.all(`
    SELECT payment_method, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM transactions
    WHERE created_at::date >= ? AND created_at::date <= ? AND is_void = 0
    GROUP BY payment_method
    ORDER BY total DESC
  `, [startDate, endDate]);

  return res.json(data);
});

// GET /api/dashboard/peak-hours
router.get('/peak-hours', requirePerm('dashboard'), async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const data = await db.all(`
    SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM transactions
    WHERE created_at::date >= ? AND created_at::date <= ? AND is_void = 0
    GROUP BY EXTRACT(HOUR FROM created_at)::int
    ORDER BY hour ASC
  `, [startDate, endDate]);

  return res.json(data);
});

// GET /api/dashboard/profit-loss
// Menerima start_date/end_date (app Flutter) ATAU from/to (web admin).
router.get('/profit-loss', requirePerm('laba-rugi'), async (req: Request, res: Response) => {
  const db = getDb();
  const start = (req.query.start_date || req.query.from) as string | undefined;
  const end = (req.query.end_date || req.query.to) as string | undefined;
  const startDate = start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  const revenue = await db.get(`
    SELECT COALESCE(SUM(grand_total), 0) as total
    FROM transactions WHERE created_at::date >= ? AND created_at::date <= ? AND is_void = 0
  `, [startDate, endDate]) as any;

  // HPP hanya untuk produk milik toko sendiri (produk titipan bukan modal toko)
  const hpp = await db.get(`
    SELECT COALESCE(SUM(ti.quantity * p.cost_price), 0) as total
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE t.created_at::date >= ? AND t.created_at::date <= ? AND t.is_void = 0
      AND p.consignor_id IS NULL
  `, [startDate, endDate]) as any;

  // Bagian penitip = penjualan barang titipan dikurangi komisi toko
  const consignorShare = await db.get(`
    SELECT COALESCE(SUM(ti.total_price * (1 - COALESCE(p.commission_percent, 0) / 100.0)), 0) as total
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE t.created_at::date >= ? AND t.created_at::date <= ? AND t.is_void = 0
      AND p.consignor_id IS NOT NULL
  `, [startDate, endDate]) as any;

  const expenses = await db.get(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE created_at::date >= ? AND created_at::date <= ?
  `, [startDate, endDate]) as any;

  // Rincian per produk (untuk export Excel di web admin)
  const items = await db.all(`
    SELECT ti.product_name,
           SUM(ti.quantity) as quantity,
           SUM(ti.total_price) as subtotal,
           SUM(CASE WHEN p.consignor_id IS NULL
                    THEN ti.quantity * p.cost_price
                    ELSE ti.total_price * (1 - COALESCE(p.commission_percent, 0) / 100.0) END) as cogs
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE t.created_at::date >= ? AND t.created_at::date <= ? AND t.is_void = 0
    GROUP BY ti.product_name
    ORDER BY subtotal DESC
  `, [startDate, endDate]) as any[];

  const grossProfit = revenue.total - hpp.total;
  const netProfit = grossProfit - expenses.total - consignorShare.total;

  return res.json({
    revenue: revenue.total,
    hpp: hpp.total,             // nama lama (app Flutter)
    cogs: hpp.total,            // nama baru (web admin)
    gross_profit: grossProfit,
    expenses: expenses.total,
    consignor_commissions: consignorShare.total,
    net_profit: netProfit,
    margin: revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0,
    items: items.map(i => ({ ...i, profit: i.subtotal - i.cogs }))
  });
});

// GET /api/dashboard/abc-analysis
router.get('/abc-analysis', requirePerm('dashboard'), async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const products = await db.all(`
    SELECT ti.product_id, ti.product_name, SUM(ti.quantity) as qty, SUM(ti.total_price) as total, SUM(ti.quantity * p.cost_price) as cost
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE t.created_at::date >= ? AND t.created_at::date <= ? AND t.is_void = 0
    GROUP BY ti.product_id, ti.product_name
    ORDER BY total DESC
  `, [startDate, endDate]) as any[];

  const grandTotal = products.reduce((sum, p) => sum + p.total, 0);
  let cumulative = 0;

  const classified = products.map(p => {
    cumulative += p.total;
    const share = grandTotal > 0 ? (p.total / grandTotal) * 100 : 0;
    const cumShare = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
    let category = 'C';
    if (cumShare <= 70) category = 'A';
    else if (cumShare <= 90) category = 'B';
    return { ...p, share, cumulative_share: cumShare, category, profit: p.total - (p.cost || 0) };
  });

  return res.json({ data: classified, summary: { A: classified.filter(p => p.category === 'A').length, B: classified.filter(p => p.category === 'B').length, C: classified.filter(p => p.category === 'C').length } });
});

export default router;
