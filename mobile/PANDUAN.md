# Kantinku — Aplikasi Android (Flutter)

Aplikasi kasir Android yang terhubung ke server backend (Node + SQLite) di satu PC melalui **WiFi lokal**.

```
   PC Server (backend Node) ──WiFi──> HP / Tablet (APK Flutter)
   192.168.x.x:3001                    "Setup Server" -> isi alamat PC
```

## A. Menjalankan Server di PC (wajib menyala saat berjualan)

1. Pastikan Node.js terpasang di PC.
2. Klik dua kali **`JALANKAN-SERVER.bat`** (ada di folder `D:\POS ESC`).
3. Jendela hitam akan menampilkan alamat server, contoh:
   ```
   http://192.168.1.17:3001
   ```
   Catat alamat ini. Biarkan jendela tetap terbuka.
4. HP/tablet **harus terhubung ke WiFi yang sama** dengan PC.

> PIN Admin awal: **123456**. Aplikasi mulai kosong — tambah kategori, menu, dan karyawan lain langsung di aplikasi.

## B. Memakai Aplikasi di HP/Tablet

1. Install file **`Kantinku.apk`** (ada di folder `D:\POS ESC`).
2. Buka aplikasi → layar **Setup Server** → isi alamat dari langkah A (mis. `http://192.168.1.17:3001`) → **Sambungkan**.
3. Login dengan PIN → mulai transaksi.

## C. Membuat (Build) File APK

Prasyarat di PC build: **Flutter SDK**, **JDK 17**, **Android SDK**.

```bash
cd "D:\POS ESC\mobile"
flutter pub get
flutter build apk --release
```

Hasil APK ada di:
```
D:\POS ESC\mobile\build\app\outputs\flutter-apk\app-release.apk
```

Salin file itu ke HP/tablet lalu install (aktifkan "Install dari sumber tidak dikenal" bila diminta).

### Build cepat untuk uji coba (debug)
```bash
flutter build apk --debug
```

## D. Fitur

- **Kasir/POS**: kategori, grid produk, keranjang, diskon, tipe order (Dine In/Take Away/Delivery), referensi meja, pilih/tambah pelanggan, pembayaran (Tunai/QRIS/Kartu/E-Wallet), **Atur Kembalian** (uang diterima + tombol pecahan cepat yang bisa diatur + kembalian otomatis), buka shift.
- **Kelola Menu**: tambah/edit/**hapus** kategori & menu (Admin/Manager).
- **Shift**: buka/tutup shift + rekap kas & selisih.
- **Dapur (KDS)**: papan 3 kolom (Baru → Dimasak → Siap), auto-refresh.
- **Stok**: daftar, sesuaikan stok (masuk/keluar/set), filter stok menipis.
- **Transaksi**: riwayat, detail item, void (batal) + kembalikan stok.
- **Pelanggan (CRM)**: database, poin, tier, deposit.
- **Dashboard**: omzet hari ini, jumlah transaksi, produk terlaris, grafik 7 hari.
- **Laporan**: Laba Rugi, metode pembayaran, analisis ABC, jam sibuk.
- **Karyawan**: kelola + peran (RBAC menyesuaikan menu).
- **Supplier & Pembelian (PO)**: buat PO, terima barang (tambah stok).
- **Biaya**: catat biaya operasional.

## E. Jika HP/Tablet tidak bisa konek ke server
1. **WiFi sama**: pastikan PC & HP di jaringan WiFi yang sama.
2. **Windows Firewall**: saat pertama menjalankan server, Windows mungkin menanyakan izin —
   pilih **Allow / Izinkan** untuk jaringan **Private**. Bila terlanjur diblokir, izinkan manual:
   *Windows Security → Firewall & network protection → Allow an app through firewall → centang Node.js*
   (atau buka port **3001** untuk profil Private).
3. **Tes dari HP**: buka browser HP ke `http://<IP-PC>:3001/api/health` — harus muncul `{"status":"ok"}`.

## F. Catatan
- Server memakai HTTP (bukan HTTPS) karena di jaringan lokal; aplikasi sudah mengizinkan cleartext untuk LAN.
- Semua data tersimpan di PC (`backend/data/pos.db`). Backup berkala dengan menyalin file tersebut.
- APK ditandatangani dengan kunci debug sehingga bisa langsung di-install (cukup untuk pemakaian internal toko).
