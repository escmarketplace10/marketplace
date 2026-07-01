# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## **Project Name:** Next-Gen Android POS System (Reference: Majoo Ecosystem)
**Target Platform:** Android (Tablet & Mobile) & Web Dashboard (Backoffice)  
**Document Version:** 1.1 (Updated: Removed Physical Table Mapping)  

---

## 1. Executive Summary & Objectives
Tujuan dari proyek ini adalah membangun aplikasi POS (Point of Sale) *all-in-one* berbasis Android yang membantu UMKM hingga bisnis skala *enterprise* mengelola operasional mereka secara digital. Mengacu pada ekosistem Majoo, sistem ini menyatukan fitur kasir, manajemen inventori *real-time*, CRM keloyalan pelanggan, absensi karyawan, otomatisasi akuntansi, serta analisis bisnis mendalam dalam satu platform terintegrasi tanpa memerlukan setup hardware yang rumit.

---

## 2. User Persona & Roles
*   **Owner (Web Backoffice):** Pemilik bisnis yang memantau performa toko, laporan keuangan, dan memegang kendali penuh atas multi-outlet.
*   **Manager / Supervisor (App/Web):** Mengelola operasional harian, menyetujui *void* transaksi, mengelola stok, dan mengatur *shift* karyawan.
*   **Kasir / Cashier (Android App):** Melayani transaksi penjualan harian, membuka/menutup *shift*, dan menerima pembayaran.
*   **Karyawan / Staf Dapur (Android App):** Memantau pesanan masuk melalui layar dapur (KDS), memproses makanan/barang, dan mencatat absensi kerja.

---

## 3. Core Modules & Feature Breakdown

### 📱 A. Modul Kasir (Point of Sale) - Android App
Fokus pada kecepatan transaksi, kemudahan UI/UX untuk layar sentuh, dan keandalan mode *offline*.

*   **Order Taking & Billing:**
    *   Sistem *Grid* / *List* Produk dengan pencarian cepat dan pemindaian *barcode* via kamera atau pemindai hardware eksternal.
    *   **Fitur Order Reference (No. Meja / Pemesan):** Input teks bebas yang fleksibel di sisi keranjang belanja untuk mencatat referensi nomor meja manual, nama pelanggan, nomor antrean, atau nomor plat kendaraan (untuk drive-thru).
    *   Kustomisasi produk: Varian (ukuran, warna) dan *Modifiers/Add-ons* (misal: ekstra keju, tingkat kepedasan).
    *   Fitur *Hold Order* (Simpan Tagihan) untuk menangguhkan transaksi yang belum selesai dibayar.
*   **Multi-Payment Integration (Omnichannel):**
    *   Tunai (disertai tombol saran uang pas/pecahan instan), Kartu Debit/Kredit, dan QRIS (Dinamis/Statis).
    *   Integrasi *E-wallet* (Gopay, OVO, ShopeePay, Dana) dan *Split Bill* (Pecah Pembayaran).
*   **Diskon & Promosi:**
    *   Diskon manual (persentase/nominal) tingkat produk atau otomatis berdasarkan skema CRM (misal: *Buy 1 Get 1* atau potongan harga khusus tier membership).
*   **Manajemen Shift (Kas Masuk/Keluar):**
    *   Buka *shift* dengan memasukkan modal awal (*petty cash*).
    *   Tutup *shift* dengan rekapitulasi otomatis uang tunai yang diterima vs sistem (mencegah kecurangan/*fraud*).
*   **Offline Mode Capability:**
    *   Kasir tetap bisa bertransaksi saat internet mati. Data disimpan di lokal (*SQLite/Room Database*) dan otomatis tersinkronisasi saat internet kembali stabil.

### 👥 B. Modul CRM (Customer Relationship Management)
Membangun loyalitas pelanggan untuk mendorong pembelian berulang (*repeat order*).

*   **Database Pelanggan:** Pencatatan nama, nomor telepon (WhatsApp), email, dan tanggal lahir langsung dari aplikasi kasir.
*   **Membership & Tiering:** Level keanggotaan (Silver, Gold, Platinum) dengan keuntungan persentase diskon yang berbeda.
*   **Point Loyalty System:** Setiap nilai transaksi tertentu menghasilkan poin yang dapat ditukarkan dengan produk gratis atau potongan harga.
*   **Deposit/Prepaid Balance:** Pelanggan dapat menyimpan saldo uang di toko untuk digunakan bertransaksi kapan saja.

### 📦 C. Modul Antrean & Kitchen Display System (KDS)
Mengakomodasi alur kerja pesanan dari kasir langsung ke bagian produksi dapur atau staf penyiapan barang secara digital.

*   **3-Column Workflow Board:** Monitor KDS membagi pesanan ke dalam 3 status *real-time*:
    1.  *Pesanan Baru (New)*: Pesanan dari kasir masuk dan berkedip.
    2.  *Sedang Dimasak (Cooking/Processing)*: Staf dapur menandai item sedang dikerjakan.
    3.  *Selesai (Ready to Serve)*: Makanan/barang siap diantar pramusaji atau diambil kurir online.
*   **Tipe Penjualan Terintegrasi:** Pemisahan alur kerja berdasarkan tag tipe pesanan: *Take Away*, *Dine In*, atau *Delivery* (GoFood/GrabFood/ShopeeFood).

### 📦 D. Modul Inventori & Manajemen Stok
Sistem pelacakan stok *real-time* untuk mencegah kehilangan barang dan kehabisan stok (*stockout*).

*   **Manajemen Stok Multi-Gudang/Outlet:** Pantau jumlah stok di setiap cabang secara *real-time*.
*   **Stock Movement Logs:** Pencatatan otomatis untuk setiap barang masuk, barang keluar, *void* transaksi, dan barang rusak.
*   **Quick Stock Opname:** Fitur mencocokkan stok fisik dengan sistem menggunakan *scanner* HP langsung di dalam aplikasi.
*   **Low Stock Alert:** Notifikasi otomatis pada dashboard jika stok produk menyentuh batas minimum yang ditentukan.
*   **Purchase Order (PO) & Supplier Management:** Membuat dokumen pemesanan ke *supplier* dan mencatat penerimaan barang langsung menambah stok.

### 💼 E. Modul Karyawan (HR & Absensi)
Mengatur performa dan hak akses staf di toko untuk meminimalkan *internal fraud*.

*   **Absensi berbasis PIN/Aplikasi:** Karyawan melakukan *clock-in/clock-out* menggunakan PIN 4 digit khusus via tablet POS.
*   **Role-Based Access Control (RBAC):** Batasan akses yang ketat (misal: Kasir tidak bisa melihat laporan profit atau melakukan *void* transaksi tanpa otorisasi PIN Manager/Supervisor).
*   **Perhitungan Komisi:** Sistem otomatis menghitung insentif/komisi karyawan berdasarkan jumlah produk yang berhasil mereka jual.

### 📊 F. Modul Analisa Bisnis (Business Intelligence & Dashboard)
Menyajikan data mentah menjadi keputusan bisnis yang strategis melalui Web Backoffice.

*   **Sales Dashboard:** Grafik penjualan *real-time*, total omzet, jumlah transaksi, dan rata-rata pengeluaran per pelanggan (*basket size*).
*   **Produk Terlaris (Top Selling Products):** Analisis produk yang paling menguntungkan menggunakan metode *ABC Analysis*.
*   **Analisis Waktu Sibuk (Peak Hours Analysis):** Grafik yang menunjukkan jam-jam tersibuk toko untuk efisiensi penjadwalan staf.
*   **Analisis Metode Pembayaran:** Memantau persentase preferensi pembayaran pelanggan (Tunai, QRIS, Kartu, Saldo CRM).

### 📑 G. Modul Akuntansi (Accounting)
Pencatatan keuangan otomatis tanpa perlu memindahkan data manual ke Excel.

*   **Otomatisasi Jurnal:** Setiap transaksi penjualan, pembelian stok, dan biaya operasional otomatis membentuk jurnal akuntansi.
*   **Laporan Keuangan Utama:**
    *   *Laporan Laba Rugi (Profit & Loss)*: Pendapatan dikurangi HPP (Harga Pokok Penjualan) dan biaya operasional secara harian/bulanan.
    *   *Arus Kas (Cash Flow)*: Memantau perputaran uang tunai (*cash*) dan non-tunai (*cashless*).
    *   *Neraca Keuangan (Balance Sheet)*.
*   **Manajemen Biaya (Expense Tracker):** Pencatatan biaya operasional toko seperti listrik, sewa tempat, air, dan gaji karyawan.

---

## 4. Non-Functional Requirements (NFR)

| Kategori | Spesifikasi / Target |
| :--- | :--- |
| **Arsitektur Aplikasi** | Android Native (Kotlin) atau Cross-platform (Flutter) untuk menjamin performa UI kasir yang responsif dan lancar. |
| **Kompatibilitas Hardware** | Mendukung Android OS minimal versi 8.0 (Oreo), optimal pada Android Tablet 10 inci, serta mendukung koneksi Bluetooth/Network untuk *Thermal Printer* dan *Cash Drawer*. |
| **Keamanan Data** | Enkripsi data sensitif (PIN, Password) menggunakan SHA-256. Komunikasi data menggunakan HTTPS / TLS 1.3. |
| **Skalabilitas Database** | Struktur database backend (misal menggunakan PostgreSQL) yang mendukung skema *multi-tenant* untuk skalabilitas ribuan outlet. |

---

## 5. UI/UX Key Screens Flow
1.  **Screen Login & PIN:** Layar pengaman absensi cepat menggunakan 4-6 digit PIN khusus karyawan.
2.  **Screen Utama Kasir (Two-Column Layout):** Sisi kiri berisi daftar kategori menu (*swipeable*) dan produk, sisi kanan berisi *keranjang belanja (cart)*, kolom input *Order Reference*, detail diskon, dan tombol besar "Proses Pembayaran".
3.  **Layar Dapur Mandiri (KDS View):** Tampilan lanskap 3 kolom (*New*, *Processing*, *Ready*) yang dioptimalkan untuk pengoperasian dengan ketukan jari staf dapur.
4.  **Screen Pembayaran:** Pop-up bersih dengan pilihan metode pembayaran (Tunai pas, Uang pas, Nominal kustom, QRIS, Kartu).

---

## 6. Target Rilis & MVP (Minimum Viable Product)
Untuk fase pertama (MVP), fitur difokuskan pada:
*   **Kasir:** Transaksi dasar, input teks referensi pesanan, cetak struk termal, pembayaran tunai & QRIS statis, mode offline dasar.
*   **Inventori:** Manajemen stok masuk/keluar standar (Single outlet).
*   **Karyawan:** Hak akses Kasir & Admin + PIN Login Absensi.
*   **Analisa Bisnis:** Laporan penjualan harian dan produk terlaris via web dashboard.

*Modul Akuntansi penuh, CRM advance (Tiering/Deposit), dan KDS multi-layar akan dirilis pada Fase 2.*