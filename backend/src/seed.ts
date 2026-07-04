import { getDb, closeDb } from './database';
import { v4 as uuid } from 'uuid';
import sha256 from 'sha256';

/**
 * Seed minimal: tanpa data contoh.
 * Hanya membuat satu akun Admin agar bisa login & mulai mengisi data sendiri.
 */
async function seed() {
  const db = getDb();

  console.log('🌱 Menyiapkan database (membuat akun admin awal)...');

  // Hapus semua data
  await db.run('DELETE FROM admin_users');
  const tables = ['loyalty_points_history', 'expenses', 'purchase_order_items', 'purchase_orders',
    'suppliers', 'inventory_movements', 'transaction_items', 'transactions',
    'employees', 'customers', 'modifier_options', 'product_modifiers', 'products',
    'consignment_settlements', 'consignors', 'categories'];

  for (const table of tables) {
    await db.run(`DELETE FROM ${table}`);
  }

  // Contoh 1 karyawan kasir (PIN 123456) supaya aplikasi bisa langsung dicoba.
  // Admin TIDAK dibuat sebagai karyawan — admin login lewat Website (admin_users).
  // Tambah/ubah kasir & petugas stok lewat menu Karyawan di Web Admin.
  await db.run('INSERT INTO employees (id, name, pin, role) VALUES (?, ?, ?, ?)', [
    uuid(), 'Kasir Contoh', sha256('123456'), 'cashier'
  ]);

  // Buat admin web default
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 10);
  await db.run(
    'INSERT INTO admin_users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
    ['admin_web_1', 'admin@kantinku.com', passwordHash, 'Super Admin']
  );

  console.log('✅ Database siap. Login Admin Web: admin@kantinku.com / password123');
  console.log('   Kasir contoh untuk aplikasi: PIN 123456 (peran Kasir).');
  console.log('   (Tambah kategori, menu, dan karyawan langsung di Web Admin.)');

  await closeDb();
}

seed().catch(console.error);
