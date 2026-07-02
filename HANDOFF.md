# HANDOFF — ESC Marketplace POS (Kantinku)

> Dokumen ini dibuat untuk melanjutkan pengembangan proyek di platform/AI lain (seperti Claude).
> Terakhir diperbarui: 2026-07-02

---

## 1. Gambaran Proyek Terbaru

**ESC Marketplace (sebelumnya Kantinku)** telah bermigrasi sepenuhnya dari sistem *offline* (berbasis WiFi lokal) menjadi sistem **Cloud Terpusat**. Aplikasi kasir (POS) Android kini terhubung langsung ke internet, dengan Web Admin Dasbor yang bisa diakses dari mana saja.

### Komponen Utama Saat Ini
| Komponen | Teknologi | Lokasi / Hosting |
|---|---|---|
| **App Android (kasir)** | Flutter 3.44 + Dart | `mobile/` (ter-build di `app-release.apk`) |
| **Backend API** | Node.js + Express + TypeScript | **Vercel** (`https://escmarketplace.vercel.app/api/*`) |
| **Frontend Admin** | React + Vite + TypeScript | **Vercel** (`https://escmarketplace.vercel.app/admin/*`) |
| **Database** | PostgreSQL | **Supabase** (Pooler: `aws-1-ap-northeast-1.pooler.supabase.com`) |
| **Source Code** | Git Repo | GitHub: `escmarketplace10/marketplace` |

> **Catatan Penting:** Folder `Server-Kantinku` (yang berisi `pos.db` SQLite lama dan `node.exe` portabel) sudah menjadi **usang/useless** karena seluruh arsitektur kini berbasis Cloud.

---

## 2. Tech Stack & Arsitektur Cloud (Baru)

### Backend (`backend/`) & Frontend Admin (`admin/`)
- **Runtime & Hosting:** Node.js, di-_deploy_ sebagai Serverless App di **Vercel**.
- **Routing Vercel:** Diatur via `vercel.json`. Semua request `/api/(.*)` diteruskan ke `backend/dist/index.js`. Request sisanya diteruskan ke _static build_ React di folder `admin/dist/`.
- **Database (PostgreSQL):** Koneksi menggunakan `pg` (Postgres client) ke Supabase. File koneksi di `backend/src/database.ts` (*menggunakan SSL `rejectUnauthorized: false`*).
- **Admin UI:** Terdapat halaman Dashboard, Laba Rugi, Stok Barang, Supplier, Pembelian (PO), Biaya Operasional, Penitip (Margin), dan Karyawan (Kasir). Semuanya didesain premium (warna Indigo/Orange) menggunakan Vanilla CSS di `App.css`.
- **Auth (Admin):** JWT via `/api/admin/login` menggunakan tabel `admin_users` (Email & Password).

### Mobile App (`mobile/`)
- **Koneksi:** Alamat server *hardcoded* di `lib/config/app_config.dart` (`baseUrl = 'https://escmarketplace.vercel.app'`). Layar `setup_server_screen.dart` telah **dihapus**.
- **Sistem Shift Dihapus:** Logika Shift (Buka/Tutup kasir harian) telah dicabut seluruhnya dari aplikasi dan API.
- **Login 2-Tahap:**
  1. Login Toko: Memasukkan Email & Password Admin (tersimpan di *shared preferences* `_kStoreLogin`).
  2. Kunci Kasir: Memasukkan PIN Karyawan 4-6 digit (diatur melalui Web Admin).
- **Keystore:** Tersimpan di `android/app/kantinku-release.jks`.

---

## 3. Struktur Folder Utama (Git Repo)

```
D:\POS ESC\
├── backend/
│   ├── src/
│   │   ├── index.ts            — Entrypoint Vercel
│   │   ├── database.ts         — Pooler Postgres Supabase (pg)
│   │   ├── seed.ts             — Injeksi default admin (admin@kantinku.com)
│   │   └── routes/             — (Admin, Auth, Customers, Employees, dsb)
│   ├── package.json            — pg, express, jsonwebtoken
│   └── tsconfig.json
│
├── admin/
│   ├── src/
│   │   ├── App.tsx             — React Router (semua route admin)
│   │   ├── App.css             — Desain Premium UI
│   │   ├── components/         — Layout.tsx (Sidebar navigation)
│   │   └── pages/              — (Dashboard, LabaRugi, Stocking, Suppliers, dll)
│   ├── package.json
│   └── vite.config.ts
│
├── mobile/
│   ├── lib/
│   │   ├── config/app_config.dart — Base URL Vercel
│   │   ├── screens/               — Layar UI Kasir Flutter
│   │   └── services/              — API HTTP caller
│   ├── android/app/               — Config Android & Keystore
│   └── pubspec.yaml
│
├── vercel.json                 — SANGAT PENTING: Routing Vercel
└── HANDOFF.md                  — Dokumen ini
```

---

## 4. Status Fitur

| # | Fitur | Status | Perubahan dari versi lama |
|---|---|---|---|
| 1 | Database Cloud | ✅ Selesai | Migrasi total dari SQLite ke Supabase (PostgreSQL). |
| 2 | Hosting & Domain | ✅ Selesai | Vercel (`escmarketplace.vercel.app`). |
| 3 | Admin Website UI | ✅ Selesai | Terbangun lengkap dengan React (9 halaman fungsional). |
| 4 | Karyawan & PIN | ✅ Selesai | PIN dienkripsi (SHA256). UI pembuatan PIN di Web Admin siap. |
| 5 | Laporan Laba Rugi | ✅ Selesai | Tersedia ekspor ke Excel dari Web Admin. |
| 6 | Transaksi & Kasir | ✅ Selesai | Terhubung via internet, *real-time* masuk ke Vercel. |
| 7 | Fitur Shift | ❌ Dihapus | Dihapus secara sengaja untuk simplifikasi. |

---

## 5. Kredensial Akses

- **Website Admin / Login Toko Mobile:**
  - **Email:** `admin@kantinku.com`
  - **Password:** `password123`
- **Dashboard Vercel:** (User login menggunakan akun Vercel mereka sendiri)
- **Database Supabase:** (User login menggunakan akun Supabase mereka)
- **URL Produksi:** `https://escmarketplace.vercel.app`

---

## 6. Development Workflow (Cara Melanjutkan)

### Mengembangkan Web Admin & Backend secara Lokal
```powershell
# 1. Jalankan backend dev (Terminal 1)
cd "D:\POS ESC\backend"
npm run dev
# Backend akan jalan di http://localhost:3001

# 2. Jalankan frontend admin (Terminal 2)
cd "D:\POS ESC\admin"
npm run dev
# Frontend akan jalan di http://localhost:5173
```
*Note:* Agar Vite Admin bisa mengakses API lokal, pastikan proxy di `admin/vite.config.ts` aktif (mengarahkan `/api` ke `localhost:3001`).

### Melakukan Deploy ke Vercel
Aplikasi ini sudah tersambung dengan GitHub CI/CD.
Setiap kali ada perubahan kode yang di-_commit_ dan di-_push_ ke cabang `master`, Vercel akan otomatis melakukan *build* ulang dan *deploy*.
```powershell
cd "D:\POS ESC"
git add .
git commit -m "Deskripsi perubahan"
git push
```

### Mengompilasi Aplikasi Mobile (APK)
Jika Anda melakukan perubahan di dalam folder `mobile/`, Anda harus mem-_build_ ulang APK-nya secara manual:
```powershell
# Ganti dengan path flutter Anda
C:\src\flutter\bin\flutter.bat build apk --release
# Hasilnya ada di: mobile/build/app/outputs/flutter-apk/app-release.apk
```

---

## 7. Hal yang Mungkin Dikerjakan Selanjutnya oleh Claude
- Menambahkan notifikasi _push_ (FCM) jika ada pesanan khusus.
- Mengubah desain halaman kasir (Flutter) menjadi gaya premium seperti _Web Admin_.
- Mengimplementasikan fitur pencetakan (*Bluetooth Thermal Printer*) di Flutter (saat ini belum didukung).
- Mengintegrasikan metode pembayaran QRIS Dinamis melalui *payment gateway* (Midtrans/Xendit) di Backend.
