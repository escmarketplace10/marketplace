import 'express-async-errors'; // error di handler async otomatis masuk error-middleware
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb, initializeSchema } from './database';
import { requireAuth } from './middleware/requireAuth';
import { requireAdminOnly } from './middleware/roleGuard';
import { requirePerm, requireSuperAdmin } from './middleware/permissions';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import customerRoutes from './routes/customers';
import employeeRoutes from './routes/employees';
import transactionRoutes from './routes/transactions';

import inventoryRoutes from './routes/inventory';
import supplierRoutes from './routes/suppliers';
import consignorRoutes from './routes/consignors';
import purchaseOrderRoutes from './routes/purchase-orders';
import expenseRoutes from './routes/expenses';
import dashboardRoutes from './routes/dashboard';
import crmRoutes from './routes/crm';
import syncRoutes from './routes/sync';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: batasi ke origin yang di-set di env (comma-separated). Kosong = izinkan semua (dev).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
// 8mb menampung foto produk base64 (~33% inflasi) tapi tetap membatasi payload.
app.use(express.json({ limit: '8mb' }));
app.use(morgan('dev'));

// Ensure database is initialized before handling requests
let isInitialized = false;
let initPromise: Promise<void> | null = null;

app.use(async (_req, res, next) => {
  if (!isInitialized) {
    if (!initPromise) {
      initPromise = initializeSchema().then(() => { isInitialized = true; });
    }
    try {
      await initPromise;
    } catch (e) {
      initPromise = null; // supaya request berikutnya mencoba lagi
      console.error('Gagal inisialisasi database:', e);
      return res.status(500).json({ error: 'Database belum siap. Coba lagi.' });
    }
  }
  next();
});

// Static file routing removed for Supabase Storage

// Semua endpoint /api/* wajib login (kecuali /health & endpoint login) —
// API ini publik di internet, tanpa ini siapa pun bisa baca/ubah data toko.
app.use(requireAuth);

// Routes
// Catatan hak akses: requirePerm hanya membatasi sub-admin (token admin
// is_super=false). Super admin & token karyawan diteruskan; guard peran lain
// (requireStockAccess/requireAdminOnly) tetap berlaku. readOpen=true membolehkan
// GET data referensi (dropdown) agar form halaman lain tidak rusak.
app.use('/api/auth', authRoutes);
app.use('/api/products', requirePerm('products', { readOpen: true }), productRoutes);
app.use('/api/categories', requirePerm('products', { readOpen: true }), categoryRoutes);
app.use('/api/customers', customerRoutes);
// Kelola karyawan & hak akses: hanya Super Admin (bukan sub-admin).
app.use('/api/employees', requireSuperAdmin, employeeRoutes);
app.use('/api/transactions', requirePerm('transactions', { readOpen: false }), transactionRoutes);

// /api/inventory & /api/dashboard punya izin per-sub-route (lihat file rutenya).
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', requirePerm('suppliers', { readOpen: true }), supplierRoutes);
app.use('/api/consignors', requirePerm('consignors', { readOpen: true }), consignorRoutes);
app.use('/api/purchase-orders', requirePerm('purchases'), purchaseOrderRoutes);
// Data keuangan/laporan & pengeluaran hanya untuk Admin (web) — kasir/petugas stok ditolak.
app.use('/api/expenses', requireAdminOnly, requirePerm('expenses'), expenseRoutes);
app.use('/api/dashboard', requireAdminOnly, dashboardRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  // Jangan bocorkan detail internal ke klien di produksi.
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'Internal Server Error',
    ...(isProd ? {} : { message: err.message }),
  });
});

import os from 'os';

function getLanIps(): string[] {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

// Serve Admin Frontend Static Files (Lokal Only)
const adminPath = path.join(__dirname, '../../admin/dist');
if (fs.existsSync(adminPath)) {
  app.use('/admin', express.static(adminPath));
  app.get('/admin/*', (_req, res) => {
    res.sendFile(path.join(adminPath, 'index.html'));
  });
}

// Start server (Only if not running on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 POS Backend running on http://localhost:${PORT}`);
    console.log(`📊 API Base URL (lokal): http://localhost:${PORT}/api`);
    const lan = getLanIps();
    if (lan.length) {
      console.log('🌐 Akses dari HP/tablet di WiFi yang sama:');
      for (const ip of lan) console.log(`   → http://${ip}:${PORT}/api`);
    }
  });

  process.on('SIGINT', () => { closeDb(); process.exit(0); });
  process.on('SIGTERM', () => { closeDb(); process.exit(0); });
}

export default app;
