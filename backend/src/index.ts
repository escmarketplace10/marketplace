import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb, initializeSchema } from './database';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import customerRoutes from './routes/customers';
import employeeRoutes from './routes/employees';
import transactionRoutes from './routes/transactions';

import inventoryRoutes from './routes/inventory';
import supplierRoutes from './routes/suppliers';
import consignorRoutes from './routes/consignors';
import path from 'path';
import purchaseOrderRoutes from './routes/purchase-orders';
import expenseRoutes from './routes/expenses';
import dashboardRoutes from './routes/dashboard';
import crmRoutes from './routes/crm';
import syncRoutes from './routes/sync';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Ensure database is initialized before handling requests
let isInitialized = false;
let initPromise: Promise<void> | null = null;

app.use(async (_req, _res, next) => {
  if (!isInitialized) {
    if (!initPromise) {
      initPromise = initializeSchema().then(() => { isInitialized = true; }).catch(console.error);
    }
    await initPromise;
  }
  next();
});

// Static file routing removed for Supabase Storage

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/transactions', transactionRoutes);

app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/consignors', consignorRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
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
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
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
