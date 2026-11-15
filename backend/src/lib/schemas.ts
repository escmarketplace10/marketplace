import { z } from 'zod';

// ---- Auth ----
export const loginPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN harus 4-6 digit angka'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Format email tidak valid').max(255),
  password: z.string().min(1, 'Password wajib diisi').max(255),
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Password lama wajib diisi').max(255),
  new_password: z.string().min(8, 'Password baru minimal 8 karakter').max(255),
});

// ---- Products ----
export const createProductSchema = z.object({
  category_id: z.string().min(1, 'category_id wajib'),
  name: z.string().min(1, 'Nama produk wajib').max(255),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  price: z.number().min(0, 'Harga tidak boleh negatif'),
  cost_price: z.number().min(0).optional().default(0),
  unit: z.string().max(50).optional().default('pcs'),
  stock: z.number().min(0).optional().default(0),
  min_stock: z.number().min(0).optional().default(0),
  is_track_stock: z.number().min(0).max(1).optional().default(1),
  consignor_id: z.string().optional().nullable(),
  commission_percent: z.number().min(0).max(100).optional().nullable(),
  image_base64: z.string().optional(),
});

// ---- Transactions ----
const transactionItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().min(1).default(1),
  unit_price: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional().default(0),
  modifier_details: z.any().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const createTransactionSchema = z.object({
  employee_id: z.string().min(1, 'employee_id wajib'),
  customer_id: z.string().optional().nullable(),
  order_type: z.enum(['dine_in', 'takeaway', 'delivery']).optional().default('dine_in'),
  order_reference: z.string().max(100).optional().nullable(),
  transaction_name: z.string().trim().min(1, 'Nama transaksi wajib diisi').max(100),
  items: z.array(transactionItemSchema).min(1, 'Minimal 1 item'),
  payment_method: z.string().max(50).optional().default('cash'),
  cash_amount: z.number().min(0).optional(),
  discount_total: z.number().min(0).optional().default(0),
  notes: z.string().max(500).optional().nullable(),
  keep_change: z.boolean().optional(),
});

// ---- Employees ----
export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN harus 4-6 digit angka').optional(),
  role: z.enum(['cashier', 'waiter', 'stocking', 'admin']).optional().default('cashier'),
  phone: z.string().max(20).optional().nullable(),
  commission_rate: z.number().min(0).max(100).optional().default(0),
  email: z.string().email().max(255).optional(),
  password: z.string().min(8).max(255).optional(),
  permissions: z.array(z.string()).optional(),
});

// ---- Expenses ----
export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Kategori wajib diisi').max(100),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive('Jumlah harus lebih dari 0'),
  payment_method: z.string().max(50).optional().default('cash'),
  reference: z.string().max(100).optional().nullable(),
  created_by: z.string().max(255).optional().nullable(),
});

// ---- Inventory ----
export const adjustStockSchema = z.object({
  product_id: z.string().min(1, 'product_id wajib'),
  quantity: z.number().positive('quantity harus lebih dari 0'),
  type: z.enum(['in', 'out', 'set'], { message: 'type harus in/out/set' }),
  notes: z.string().max(500).optional(),
  reason: z.string().max(50).optional(),
});

export const transferStockSchema = z.object({
  product_id: z.string().min(1, 'product_id wajib'),
  quantity: z.number().positive('quantity harus lebih dari 0'),
});

// ---- Customers ----
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Nama wajib').max(255),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  birthday: z.string().max(20).optional().nullable(),
});

// ---- Suppliers ----
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nama wajib').max(255),
  contact_person: z.string().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});
