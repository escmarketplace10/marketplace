import { getDb, closeDb } from './database';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * Seed minimal: tanpa data contoh.
 * Hanya membuat satu akun Admin agar bisa login & mulai mengisi data sendiri.
 */
async function seed() {
  const db = getDb();

  console.log('Menyiapkan database (membuat akun admin awal)...');

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
  const hashedPin = await bcrypt.hash('123456', 10);
  await db.run('INSERT INTO employees (id, name, pin, role) VALUES (?, ?, ?, ?)', [
    uuid(), 'Kasir Contoh', hashedPin, 'cashier'
  ]);

  // Buat admin web default — password dari env, atau acak (cetak sekali).
  const crypto = require('crypto');
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@kantinku.com';
  const envPass = process.env.DEFAULT_ADMIN_PASSWORD;
  const password = envPass || crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 10);
  await db.run(
    'INSERT INTO admin_users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
    ['admin_web_1', email, passwordHash, 'Super Admin']
  );

  console.log(`Database siap. Login Admin Web: ${email}`);
  if (!envPass) {
    console.log('PASSWORD AWAL telah di-generate. Cek output di atas sekali saja.');
    console.log(`Set DEFAULT_ADMIN_PASSWORD di env untuk menghindari password acak.`);
    // Print password ke stderr (bukan stdout) untuk mengurangi risiko tercatat di log biasa
    process.stderr.write(`[SEED] Generated admin password: ${password}\n`);
  }
  console.log('Kasir contoh untuk aplikasi: PIN 123456 (peran Kasir).');

  await closeDb();
}

seed().catch(console.error);
