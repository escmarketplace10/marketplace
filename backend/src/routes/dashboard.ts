import { Router, Request, Response } from 'express';
import { getDb } from '../database';

const router = Router();

// GET /api/dashboard/summary - Today's overview
router.get('/summary', async (_req: Request, res: Response) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const sales = await db.all(`
    SELECT
      COALESCE(COUNT(*), 0) as transaction_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(AVG(grand_total), 0) as avg_basket
    FROM transactions
    WHERE date(created_at) = ? AND is_void = 0
  `, [today]) as any;

  const topProducts = await db.get(`
    SELECT ti.product_id, ti.product_name, SUM(ti.quantity) as qty, SUM(ti.total_price) as total
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    WHERE date(t.created_at) = ? AND t.is_void = 0
    GROUP BY ti.product_id
    ORDER BY qty DESC
    LIMIT 10
  `, [today]);

  const lowStock = await db.all(`
    SELECT COUNT(*) as count FROM products
    WHERE is_track_stock = 1 AND is_active = 1 AND stock <= min_stock
  `) as any;

  const employees = await db.get("SELECT COUNT(*) as count FROM employees WHERE is_active = 1") as any;
  const customers = await db.get("SELECT COUNT(*) as count FROM customers") as any;

  return res.json({
    sales,
    topProducts,
    alerts: { low_stock: lowStock.count },
    counts: { employees: employees.count, customers: customers.count }
  });
});

// GET /api/dashboard/sales-chart - Sales data for charts
router.get('/sales-chart', async (req: Request, res: Response) => {
  const db = getDb();
  const { period, start_date, end_date } = req.query;
  const days = period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 7;

  const startDate = start_date || new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const data = await db.get(`
    SELECT date(created_at) as date, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM transactions
    WHERE date(created_at) >= ? AND date(created_at) <= ? AND is_void = 0
    GROUP BY date(created_at)
    ORDER BY date ASC
  `, [startDate, endDate]);

  return res.json(data);
});

// GET /api/dashboard/payment-methods
router.get('/payment-methods', async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date().toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const data = await db.all(`
    SELECT payment_method, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM transactions
    WHERE date(created_at) >= ? AND date(created_at) <= ? AND is_void = 0
    GROUP BY payment_method
    ORDER BY total DESC
  `, [startDate, endDate]);

  return res.json(data);
});

// GET /api/dashboard/peak-hours
router.get('/peak-hours', async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const data = await db.all(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM transactions
    WHERE date(created_at) >= ? AND date(created_at) <= ? AND is_void = 0
    GROUP BY hour
    ORDER BY hour ASC
  `, [startDate, endDate]);

  return res.json(data);
});

// GET /api/dashboard/profit-loss
router.get('/profit-loss', async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const revenue = await db.all(`
    SELECT COALESCE(SUM(grand_total), 0) as total
    FROM transactions WHERE date(created_at) >= ? AND date(created_at) <= ? AND is_void = 0
  `, [startDate, endDate]) as any;

  const hpp = await db.get(`
    SELECT COALESCE(SUM(ti.quantity * p.cost_price), 0) as total
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE date(t.created_at) >= ? AND date(t.created_at) <= ? AND t.is_void = 0
  `, [startDate, endDate]) as any;

  const expenses = await db.get(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE date(created_at) >= ? AND date(created_at) <= ?
  `, [startDate, endDate]) as any;

  const grossProfit = revenue.total - hpp.total;
  const netProfit = grossProfit - expenses.total;

  return res.json({
    revenue: revenue.total,
    hpp: hpp.total,
    gross_profit: grossProfit,
    expenses: expenses.total,
    net_profit: netProfit,
    margin: revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0
  });
});

// GET /api/dashboard/abc-analysis
router.get('/abc-analysis', async (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  const products = await db.all(`
    SELECT ti.product_id, ti.product_name, SUM(ti.quantity) as qty, SUM(ti.total_price) as total, SUM(ti.quantity * p.cost_price) as cost
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    WHERE date(t.created_at) >= ? AND date(t.created_at) <= ? AND t.is_void = 0
    GROUP BY ti.product_id
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
