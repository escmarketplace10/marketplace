# HANDOFF — Kantinku POS

> Dokumen ini dibuat untuk melanjutkan pengembangan proyek di platform/AI lain.
> Terakhir diperbarui: 2026-07-01

---

## 1. Gambaran Proyek

**Kantinku** adalah aplikasi kasir (POS) Android bermerek oranye untuk UMKM/kuliner/retail, dijual sekali bayar tanpa biaya bulanan. Berjalan di jaringan WiFi lokal — satu server PC melayani banyak HP kasir sekaligus.

### Komponen Utama
| Komponen | Teknologi | Lokasi |
|---|---|---|
| **App Android (kasir)** | Flutter 3.44 + Dart | `mobile/` |
| **Backend API** | Node.js + Express + TypeScript + better-sqlite3 | `backend/` |
| **Server portabel (untuk pembeli)** | bundle: node.exe + dist/ + pos.db | `Server-Kantinku/` |
| **APK siap jual** | Release-signed (keystore) | `Kantinku.apk` |
| **Lembar fitur (materi jual)** | PDF ReportLab | `Fitur-Kantinku.pdf` |
| **Panduan penggunaan** | PDF ReportLab | `Panduan-Penggunaan-Kantinku.pdf` |

---

## 2. Tech Stack

### Backend (`backend/`)
- **Runtime:** Node.js (v20+)
- **Framework:** Express 4
- **Language:** TypeScript (`tsconfig.json` → output ke `dist/`)
- **Database:** `better-sqlite3` — SQLite synchronous, file `backend/data/pos.db`
- **Auth karyawan:** SHA-256 PIN hash (`/api/auth/login` → JWT payload, tapi `jsonwebtoken` belum dipakai — masih custom token string)
- **Port:** 3001 (bind `0.0.0.0` — akses dari LAN)
- **Build:** `npx tsc` → `dist/`

### Frontend / App (`mobile/`)
- **Framework:** Flutter 3.44.2
- **State management:** `provider` (`Session` extends `ChangeNotifier`)
- **HTTP:** custom `Api` class di `lib/services/api.dart` (semua panggilan ke `http://<server-ip>:3001/api`)
- **RBAC:** `Session.can(area)` — `admin/super_admin/owner/manager` → akses semua, `cashier` → set terbatas
- **Tema:** oranye `#F97316`, sidebar gelap `#1C1C2E`

### Toolchain (mesin developer, Windows 11)
```powershell
# Set env sebelum build APK
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
$env:Path = "C:\src\flutter\bin;$env:JAVA_HOME\bin;" + $env:Path

cd "D:\POS ESC\mobile"
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
# → copy manual ke D:\POS ESC\Kantinku.apk
```

---

## 3. Struktur Folder

```
D:\POS ESC\
├── backend/
│   ├── src/
│   │   ├── index.ts            — entrypoint Express, daftar semua route
│   │   ├── database.ts         — inisialisasi SQLite + migrasi inline
│   │   ├── seed.ts             — reset DB ke kondisi awal (admin PIN 123456)
│   │   └── routes/
│   │       ├── auth.ts         — POST /api/auth/login (PIN karyawan)
│   │       ├── categories.ts   — CRUD kategori produk
│   │       ├── consignors.ts   — CRUD penitip + laporan komisi + settle
│   │       ├── crm.ts          — poin loyalitas, tier, riwayat belanja
│   │       ├── customers.ts    — CRUD pelanggan
│   │       ├── dashboard.ts    — statistik + grafik + ABC + jam sibuk
│   │       ├── employees.ts    — CRUD karyawan + PIN
│   │       ├── expenses.ts     — CRUD biaya operasional
│   │       ├── inventory.ts    — mutasi stok manual (tambah/kurangi/set)
│   │       ├── products.ts     — CRUD produk + upload foto (base64→file)
│   │       ├── purchase-orders.ts — PO (pembelian) + receive → stok +
│   │       ├── shifts.ts       — buka/tutup shift + rekap kas
│   │       ├── suppliers.ts    — CRUD supplier
│   │       ├── sync.ts         — endpoint sinkronisasi (belum dipakai app)
│   │       └── transactions.ts — buat transaksi, void, riwayat, laporan
│   ├── data/
│   │   ├── pos.db              — SQLite database (DEV, gitignore)
│   │   └── uploads/            — foto produk (base64 disimpan sebagai file)
│   ├── dist/                   — hasil `npx tsc` (jangan edit manual)
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── config/
│   │   │   └── app_config.dart  — SharedPreferences: server URL + session
│   │   ├── core/
│   │   │   ├── format.dart      — rupiah(), toDouble(), toInt(), formatDate()
│   │   │   ├── theme.dart       — AppColors (primary orange, sidebar dark)
│   │   │   └── widgets.dart     — Loading, EmptyState, ProductThumb, showSnack
│   │   ├── services/
│   │   │   └── api.dart         — semua method HTTP (GET/POST/PUT/DELETE)
│   │   ├── state/
│   │   │   └── session.dart     — Session (ChangeNotifier): karyawan + shift + RBAC
│   │   └── screens/
│   │       ├── home_screen.dart         — shell utama (sidebar + nav + header)
│   │       ├── login_screen.dart        — login PIN karyawan
│   │       ├── setup_server_screen.dart — input URL server (simpan ke prefs)
│   │       ├── pos_screen.dart          — layar kasir
│   │       ├── menu_screen.dart         — kelola menu (produk + kategori)
│   │       ├── inventory_screen.dart    — mutasi stok
│   │       ├── transactions_screen.dart — riwayat transaksi + void
│   │       ├── customers_screen.dart    — kelola pelanggan + CRM
│   │       ├── shifts_screen.dart       — buka/tutup shift
│   │       ├── dashboard_screen.dart    — statistik & grafik
│   │       ├── reports_screen.dart      — laporan laba-rugi, ABC, jam sibuk
│   │       ├── employees_screen.dart    — kelola karyawan
│   │       ├── suppliers_screen.dart    — kelola supplier
│   │       ├── consignors_screen.dart   — penitip barang + laporan komisi
│   │       ├── purchase_orders_screen.dart — PO & penerimaan barang
│   │       └── expenses_screen.dart     — catat biaya operasional
│   ├── android/
│   │   ├── app/
│   │   │   ├── kantinku-release.jks   — KEYSTORE (RAHASIA, backup di luar PC!)
│   │   │   └── build.gradle
│   │   ├── key.properties             — password keystore (gitignore)
│   │   └── gradle.properties          — kotlin.incremental=false (JANGAN hapus)
│   └── assets/
│       └── logo.png
│
├── Server-Kantinku/              — paket untuk PEMBELI
│   ├── node.exe                  — Node.js portable (versi harus sama dgn node_modules)
│   ├── Mulai-Server.bat          — klik untuk start server (foreground)
│   ├── Pasang-Otomatis.bat       — pasang sebagai Windows Service (nssm)
│   ├── Hapus-Otomatis.bat        — copot Windows Service
│   ├── Lihat-Alamat-Server.bat   — cek IP LAN
│   ├── nssm.exe                  — NSSM untuk Windows Service
│   └── app/
│       ├── dist/                 — hasil build backend (copy dari backend/dist/)
│       ├── node_modules/
│       └── data/
│           ├── pos.db            — SQLite database PRODUCTION (pembeli)
│           └── uploads/
│
├── JALANKAN-SERVER.bat           — untuk developer (jalankan backend dev)
├── Kantinku.apk                  — APK siap install (release-signed)
├── Fitur-Kantinku.pdf            — lembar fitur untuk calon pembeli
├── Panduan-Penggunaan-Kantinku.pdf
├── make_feature_sheet_pdf.py     — generator Fitur-Kantinku.pdf (ReportLab)
├── make_guide_pdf.py             — generator Panduan-Penggunaan-Kantinku.pdf
├── make_logo.py                  — generator logo.png
└── PRD.md                        — PRD awal (sudah sebagian terimplementasi)
```

---

## 4. Database Schema (SQLite saat ini)

Tabel-tabel utama dan relasinya:

```
categories          ← products (category_id)
consignors          ← products (consignor_id, opsional)
products            ← transaction_items (product_id)
                    ← inventory_mutations (product_id)
                    ← purchase_order_items (product_id)
employees           ← transactions (employee_id)
                    ← shifts (employee_id)
customers           ← transactions (customer_id, opsional)
                    ← loyalty_points (customer_id)
suppliers           ← purchase_orders (supplier_id)
purchase_orders     ← purchase_order_items (order_id)
shifts              ← transactions (shift_id, opsional)
transactions        ← transaction_items (transaction_id)
consignors          ← consignment_settlements (consignor_id)
```

**Tabel khusus konsinyasi** (ditambah via migrasi inline di `database.ts`):
- `consignors` — id, name, phone, notes, is_active
- `consignment_settlements` — id, consignor_id, period_start, period_end, total_sales, commission_amount, payable_amount
- `products.consignor_id` + `products.commission_percent` — nullable, diisi kalau barang titipan

---

## 5. Fitur yang Sudah Selesai (Status per 2026-07-01)

| # | Fitur | Status |
|---|---|---|
| 1 | Kasir (POS) — grid produk, keranjang, diskon, tipe pesanan | ✅ Selesai |
| 2 | Multi-payment (Tunai/QRIS/Kartu/E-Wallet) + kembalian | ✅ Selesai |
| 3 | Kelola Menu (CRUD produk + kategori + upload foto) | ✅ Selesai |
| 4 | Manajemen Stok (mutasi manual + stok berkurang/bertambah otomatis) | ✅ Selesai |
| 5 | Shift Kasir (buka/tutup + rekap kas) | ✅ Selesai |
| 6 | Riwayat Transaksi + Void (stok balik otomatis) | ✅ Selesai |
| 7 | Pelanggan & CRM (poin, tier, deposit) | ✅ Selesai |
| 8 | Dashboard & Laporan (omzet, grafik, laba-rugi, ABC, jam sibuk) | ✅ Selesai |
| 9 | Karyawan & RBAC (admin/manager/kasir, PIN masing-masing) | ✅ Selesai |
| 10 | Supplier & PO (pembelian + terima → stok +) | ✅ Selesai |
| 11 | Penitip & Komisi Titipan (konsinyasi) | ✅ Selesai |
| 12 | Biaya Operasional | ✅ Selesai |
| 13 | Server portabel untuk pembeli (node.exe bundle + bat) | ✅ Selesai |
| 14 | APK release-signed (keystore) | ✅ Selesai |
| 15 | Materi jual (PDF fitur + panduan) | ✅ Selesai |

**Yang sudah dihapus** (sempat ada, dihapus atas permintaan):
- Fitur Dapur/KDS — dihapus total dari backend + mobile karena tidak terpakai

---

## 6. Fitur yang BELUM Selesai / Next Step

### 🔴 Prioritas Utama: Website Admin Cloud

Pemilik toko minta **admin website berbasis browser** yang bisa diakses dari mana saja (bukan hanya dari WiFi lokal toko). Ini adalah task besar yang belum dikerjakan sama sekali.

**Keputusan yang sudah disetujui user:**
1. Satu server cloud untuk semua — app HP & website admin connect ke server yang sama
2. Semua fitur admin (Dashboard, Laporan, Kelola Menu, Karyawan, Penitip, Supplier/PO, Biaya)
3. Login website pakai **password terpisah** (bukan PIN kasir)
4. Hosting **gratis** (Render free tier + Supabase free Postgres)

**Konsekuensi teknis yang harus dikerjakan:**

#### Fase A — Migrasi Database SQLite → Postgres
- Ganti `better-sqlite3` dengan `pg`
- Buat wrapper `backend/src/db.ts` dengan method `db.get/all/run/transaction()` yang auto-konversi placeholder `?` → `$1,$2,...`
- DDL di `database.ts`: ganti `datetime('now')` → `now()`, migrasi kolom pakai `ADD COLUMN IF NOT EXISTS` (Postgres native)
- Semua 15 route file: ubah ke async/await + pakai wrapper baru
- Update `package.json`: hapus `better-sqlite3`, tambah `pg`, `bcryptjs`, `dotenv`

#### Fase B — Login Admin Website
- Tabel `admin_users` (id, username, password_hash, name)
- Route `POST /api/admin/login` → JWT (pakai `jsonwebtoken` yang sudah ada di package.json tapi belum dipakai)
- Middleware `requireAdminAuth` untuk semua route admin-website
- Seed 1 akun admin awal

#### Fase C — Frontend Admin (React SPA)
- Folder baru `admin/` — Vite + React + TypeScript
- Branding oranye Kantinku (`#F97316`)
- Halaman: Login, Dashboard, Kelola Menu, Karyawan, Penitip & Komisi, Supplier & PO, Biaya, Transaksi, Shift, Pelanggan, Stok
- Build static → di-serve oleh Express yang sama di `/admin`

#### Fase D — Deploy ke Cloud + Fix Bug
- `git init` di `D:\POS ESC\`, `.gitignore`, push ke GitHub repo privat
- Buat project Postgres gratis di **Supabase** (user perlu daftar sendiri)
- Deploy ke **Render** free Web Service (user perlu daftar sendiri)
- **Fix bug `_normalize()` di `mobile/lib/screens/setup_server_screen.dart`**: saat URL `https://` tanpa port eksplisit, kode salah menambahkan `:3001` → harusnya pakai port default HTTPS. Bug ini harus difix supaya app HP bisa diarahkan ke URL cloud.
- Rebuild + sign ulang APK

#### Fase E — Data
- Database cloud mulai **kosong** (bukan migrasi dari pos.db lokal — itu cuma data testing)

### 🟡 Prioritas Rendah (Fitur Native, Opsional)
- Scan barcode via kamera HP
- Printer termal Bluetooth
- Mode offline + sync (`/api/sync` di backend sudah ada tapi belum dipakai app)
- Sistem lisensi/aktivasi (APK sekarang bisa disalin bebas)
- Backup otomatis database
- Upload ke Play Store

---

## 7. Quirks Teknis Penting

### better-sqlite3 adalah synchronous
Semua query di route saat ini **tidak pakai async/await**:
```typescript
// Sekarang (SQLite):
const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

// Setelah migrasi ke Postgres harus jadi:
const row = await db.get('SELECT * FROM products WHERE id = ?', [id]);
```
Wrapper `db.ts` yang direncanakan akan menyembunyikan detail ini.

### Dua database (dev vs produksi pembeli)
- `backend/data/pos.db` — database DEV (dipakai saat `npm run dev`)
- `Server-Kantinku/app/data/pos.db` — database PRODUKSI pembeli

Setiap kali backend diubah: wajib `npx tsc` lalu copy `backend/dist/*` → `Server-Kantinku/app/dist/`. Kalau ada route yang dihapus dari source, file lama di `dist/` tidak otomatis terhapus (cp tidak clean target) — harus hapus manual.

### Keystore APK — KRITIS
```
File    : mobile/android/app/kantinku-release.jks
Password: Kantinku#2026
Alias   : kantinku
```
File ini di-gitignore. Kalau hilang, APK update ke pembeli yang sudah install tidak bisa (harus uninstall dulu). **Wajib backup di luar PC.**

### NSSM (Windows Service untuk pembeli)
Jebakan NSSM: jangan set `AppParameters` ke path dengan spasi. Gunakan `AppDirectory` + path relatif. Semua perintah `nssm` butuh UAC admin.

### `kotlin.incremental=false` di `android/gradle.properties`
Jangan dihapus. Dibutuhkan karena proyek ada di drive D: tapi pub cache di C: → Kotlin incremental compiler gagal dengan error "different roots".

### Bug `_normalize()` di `setup_server_screen.dart` (~baris 40)
`Uri.hasPort` return false untuk `https://example.com` → kode menambahkan `:3001` → jadi `https://example.com:3001` (salah). Harus diperbaiki sebelum app HP bisa connect ke server cloud HTTPS.

---

## 8. API Endpoints (ringkasan)

Semua endpoint diawali `/api/`:

| Path | Method | Deskripsi |
|---|---|---|
| `/auth/login` | POST | Login PIN karyawan → token + employee |
| `/auth/shift` | GET/POST | Cek shift aktif / buka shift |
| `/auth/shift/:id/close` | POST | Tutup shift |
| `/categories` | GET/POST/PUT/DELETE | CRUD kategori |
| `/products` | GET/POST/PUT/DELETE | CRUD produk (+ foto base64) |
| `/customers` | GET/POST/PUT/DELETE | CRUD pelanggan |
| `/employees` | GET/POST/PUT/DELETE | CRUD karyawan |
| `/transactions` | GET/POST | Daftar + buat transaksi |
| `/transactions/:id/void` | POST | Void transaksi |
| `/shifts` | GET | Riwayat shift |
| `/inventory` | GET/POST | Cek stok / mutasi manual |
| `/suppliers` | GET/POST/PUT/DELETE | CRUD supplier |
| `/consignors` | GET/POST/PUT/DELETE | CRUD penitip |
| `/consignors/:id/report` | GET | Rincian item belum disetor |
| `/consignors/:id/settle` | POST | Setor ke penitip |
| `/purchase-orders` | GET/POST/PUT | PO + terima barang |
| `/expenses` | GET/POST/PUT/DELETE | Biaya operasional |
| `/dashboard` | GET | Statistik + grafik |
| `/crm/:customerId` | GET | Profil CRM pelanggan |
| `/sync` | POST | Sinkronisasi (belum dipakai) |
| `/health` | GET | Health check |

---

## 9. Cara Jalankan Dev Environment

### Backend
```powershell
cd "D:\POS ESC\backend"
npm run dev        # ts-node-dev, hot reload
# atau
npx tsc && node dist/index.js
```

### Reset Database
```powershell
cd "D:\POS ESC\backend"
npx ts-node src/seed.ts
# Hapus semua data, sisakan 1 karyawan admin PIN 123456
```

### Build APK
```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
$env:Path = "C:\src\flutter\bin;$env:JAVA_HOME\bin;" + $env:Path
cd "D:\POS ESC\mobile"
flutter build apk --release
copy build\app\outputs\flutter-apk\app-release.apk "D:\POS ESC\Kantinku.apk"
```

### Update Server-Kantinku setelah ubah backend
```powershell
cd "D:\POS ESC\backend"
npx tsc
# Copy hasil build ke Server-Kantinku, lalu hapus route lama yang sudah dihapus dari source
Copy-Item -Recurse -Force dist\* "..\Server-Kantinku\app\dist\"
```

---

## 10. Tidak Ada Git Repo

**`D:\POS ESC` belum di-init git sama sekali.** Sebelum deploy ke Render/GitHub, perlu:
```powershell
cd "D:\POS ESC"
git init
# Buat .gitignore dulu (node_modules, dist, *.db, .env, *.jks, key.properties)
git add .
git commit -m "initial commit"
# Buat repo GitHub privat, lalu:
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin master
```
Konfirmasi ke user dulu sebelum push (aksi visible ke pihak luar).

---

## 11. Rencana Teknis Detail (Website Admin Cloud)

Rencana lengkap sudah ditulis sebelumnya dan tersimpan di:
`C:\Users\N3N0C\.claude\plans\zippy-doodling-cray.md`

Ringkasannya ada di Bagian 6 dokumen ini (Fase A–E).

---

## 12. Referensi File Penting

| File | Peran |
|---|---|
| `backend/src/database.ts` | Schema SQLite + migrasi inline |
| `backend/src/index.ts` | Entrypoint Express, semua route terdaftar di sini |
| `mobile/lib/services/api.dart` | Semua pemanggilan API dari Flutter |
| `mobile/lib/state/session.dart` | RBAC + state login + shift |
| `mobile/lib/screens/setup_server_screen.dart` | Input URL server (ada bug `_normalize`) |
| `mobile/android/gradle.properties` | `kotlin.incremental=false` — jangan hapus |
| `mobile/android/key.properties` | Password keystore (gitignore) |
| `Server-Kantinku/Mulai-Server.bat` | Entrypoint untuk pembeli |
