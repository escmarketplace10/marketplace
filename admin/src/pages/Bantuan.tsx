import { HelpCircle } from 'lucide-react';

// Halaman panduan untuk pemilik/pengelola toko. Tidak mengambil data —
// murni penjelasan fungsi tiap menu & istilah, dalam bahasa sederhana.

type Item = { term: string; desc: string };
type Section = { icon: string; title: string; intro?: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    icon: '📊',
    title: 'Dashboard',
    intro: 'Layar pertama setelah login. Ringkasan kondisi toko hari ini.',
    items: [
      { term: 'Omzet hari ini', desc: 'Total uang masuk dari penjualan hari ini.' },
      { term: 'Jumlah transaksi', desc: 'Berapa kali terjadi penjualan hari ini.' },
      { term: 'Stok rendah', desc: 'Jumlah produk yang stoknya sudah menipis (di bawah/di batas Stok Minimum). Sinyal untuk segera belanja/restok.' },
    ],
  },
  {
    icon: '🧾',
    title: 'Transaksi',
    intro: 'Daftar semua penjualan yang dibuat kasir lewat aplikasi HP.',
    items: [
      { term: 'No. Struk', desc: 'Nomor unik tiap penjualan. Untuk mencari/mencocokkan.' },
      { term: 'Kasir', desc: 'Karyawan yang melayani penjualan itu.' },
      { term: 'Selesai vs Void', desc: '"Selesai" = penjualan sah. "Void" = penjualan yang dibatalkan.' },
      { term: 'Batalkan Transaksi (Void)', desc: 'Membatalkan penjualan yang salah. Stok barang otomatis dikembalikan. Isi alasan agar ada catatan. Hati-hati — ini mengubah laporan.' },
    ],
  },
  {
    icon: '📈',
    title: 'Laba Rugi',
    intro: 'Laporan untung/rugi toko dalam satu periode (rentang tanggal).',
    items: [
      { term: 'Pendapatan', desc: 'Total penjualan yang sah pada periode itu.' },
      { term: 'HPP (Harga Pokok Penjualan / Modal)', desc: 'Modal barang yang terjual — dihitung dari Harga Modal tiap produk.' },
      { term: 'Biaya Operasional', desc: 'Pengeluaran lain seperti sewa, listrik, gaji. Diambil dari menu Biaya Operasional.' },
      { term: 'Laba bersih', desc: 'Pendapatan − HPP − Biaya Operasional. Ini keuntungan sebenarnya.' },
    ],
  },
  {
    icon: '🍽️',
    title: 'Kelola Menu (Produk)',
    intro: 'Tambah, ubah, hapus produk/menu yang dijual. Aplikasi kasir HP membaca dari sini — jadi semua perubahan menu dilakukan di web ini.',
    items: [
      { term: 'Harga Jual', desc: 'Harga yang dibayar pembeli.' },
      { term: 'Harga Modal', desc: 'Modal/biaya beli produk. Dipakai menghitung HPP & laba. Isi sebenar mungkin agar laporan akurat.' },
      { term: 'Kategori', desc: 'Pengelompokan menu (mis. Minuman, Makanan) agar rapi di kasir.' },
      { term: 'Satuan', desc: 'Unit jual: pcs, gelas, porsi, gram, dll.' },
      { term: 'Lacak Stok', desc: 'Nyalakan bila stok produk ini mau dihitung otomatis (berkurang saat terjual). Matikan untuk item tanpa stok (mis. jasa/menu racikan tak terbatas).' },
      { term: 'Stok Awal', desc: 'Jumlah stok saat produk pertama dibuat.' },
      { term: 'Stok Minimum', desc: 'Batas peringatan. Bila stok turun sampai/di bawah angka ini, produk ditandai "Rendah" dan muncul di Dashboard. Contoh: set 5 untuk gas/gula agar diingatkan sebelum benar-benar habis.' },
      { term: 'Barang Titipan (Konsinyasi)', desc: 'Tandai bila produk milik penitip, lalu pilih penitipnya. Lihat bagian Penitip.' },
      { term: 'Barcode / SKU', desc: 'Kode produk (opsional) untuk scan/pencarian cepat.' },
    ],
  },
  {
    icon: '📦',
    title: 'Stok Barang',
    intro: 'Pantau jumlah stok dan lakukan penyesuaian manual.',
    items: [
      { term: 'Stok Saat Ini', desc: 'Sisa jumlah barang sekarang.' },
      { term: 'Badge Tersedia / Rendah / Habis', desc: 'Warna status: cukup, menipis (≤ Stok Minimum), atau habis (0).' },
      { term: 'Barang Masuk', desc: 'Menambah stok manual (mis. koreksi hitung / temuan barang).' },
      { term: 'Barang Keluar', desc: 'Mengurangi stok manual dengan alasan: Rusak, Hilang, Kadaluarsa, Koreksi, atau Lainnya. Semua tercatat di Riwayat Stok.' },
    ],
  },
  {
    icon: '🕘',
    title: 'Riwayat Stok (Kartu Stok)',
    intro: 'Catatan setiap barang masuk & keluar. Untuk audit — tahu kenapa stok berubah dan siapa yang mengubah.',
    items: [
      { term: 'Masuk / Keluar / Set Manual', desc: 'Jenis pergerakan stok.' },
      { term: 'Referensi', desc: 'Asal perubahan: Penjualan (terjual), Pembelian/PO (restok dari supplier), Stock Opname (hasil hitung ulang), atau manual.' },
      { term: 'Oleh', desc: 'Siapa yang melakukan perubahan.' },
    ],
  },
  {
    icon: '🚚',
    title: 'Supplier',
    intro: 'Data pemasok/vendor tempat Anda kulakan bahan atau barang.',
    items: [
      { term: 'Kontak PIC', desc: 'Nama orang yang dihubungi di supplier itu.' },
      { term: 'Telepon / Email / Alamat', desc: 'Info kontak untuk pemesanan.' },
    ],
  },
  {
    icon: '🛒',
    title: 'Pembelian (PO)',
    intro: 'Catat pembelian barang dari supplier. Menambah stok sekaligus mencatat modal keluar.',
    items: [
      { term: 'No. PO', desc: 'Nomor pesanan pembelian.' },
      { term: 'Item Pembelian', desc: 'Barang apa saja dan berapa jumlahnya. Stok produk otomatis bertambah sesuai ini.' },
      { term: 'Supplier', desc: 'Dari pemasok mana barang dibeli.' },
    ],
  },
  {
    icon: '💸',
    title: 'Biaya Operasional',
    intro: 'Catat pengeluaran di luar modal barang. Ikut mengurangi laba di laporan.',
    items: [
      { term: 'Kategori', desc: 'Jenis biaya: sewa, listrik, air, gaji, transport, dll.' },
      { term: 'Jumlah (Rp)', desc: 'Nominal pengeluaran.' },
      { term: 'Metode Pembayaran', desc: 'Tunai / transfer, dll — sekadar catatan.' },
    ],
  },
  {
    icon: '🤝',
    title: 'Penitip / Margin (Konsinyasi)',
    intro: 'Untuk barang titipan orang lain yang dijual di toko dengan sistem bagi hasil.',
    items: [
      { term: 'Cara kerja', desc: 'Produk ditautkan ke seorang penitip + persen komisi. Saat produk terjual, sistem menghitung bagian penitip; sisanya jadi pendapatan toko.' },
      { term: 'Data penitip', desc: 'Nama & No. HP penitip untuk pembagian hasil dan kontak.' },
      { term: 'Komisi per produk', desc: 'Persentase komisi diatur saat menambah/mengedit produk, bukan di halaman ini.' },
    ],
  },
  {
    icon: '👥',
    title: 'Karyawan (Kasir)',
    intro: 'Kelola akun login untuk aplikasi kasir di HP.',
    items: [
      { term: 'Peran', desc: 'Kasir (melayani penjualan) atau Petugas Stok.' },
      { term: 'Komisi Penjualan (%)', desc: 'Persen komisi karyawan dari penjualan, bila dipakai.' },
      { term: 'Nonaktif', desc: 'Menonaktifkan karyawan yang berhenti agar tidak bisa login lagi.' },
    ],
  },
  {
    icon: '📜',
    title: 'Log Aktivitas (Audit)',
    intro: 'Catatan otomatis semua perubahan penting di panel: siapa, apa, dan kapan. Berguna untuk mengecek bila ada data yang berubah tanpa sepengetahuan Anda.',
    items: [
      { term: 'Aksi', desc: 'Jenis perubahan: Tambah, Ubah, Hapus, Void, Terima, Login, Ganti Password.' },
      { term: 'Data', desc: 'Bagian apa yang diubah: Produk, Stok, Karyawan, Biaya, Transaksi, dll.' },
      { term: 'Pelaku', desc: 'Siapa yang melakukan — admin atau karyawan tertentu. Diambil dari akun login, tidak bisa dipalsukan.' },
      { term: 'Filter & cari', desc: 'Saring per jenis data/aksi atau cari kata kunci untuk menelusuri kejadian tertentu.' },
    ],
  },
  {
    icon: '🔐',
    title: 'Akun & Keamanan',
    items: [
      { term: 'Ganti Password', desc: 'Ubah kata sandi admin (minimal 8 karakter). Setelah diganti, wajib login ulang.' },
      { term: 'Keluar', desc: 'Logout dari panel. Sesi login berlaku 7 hari; setelah itu diminta login lagi.' },
    ],
  },
];

export default function Bantuan() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Panduan Penggunaan</div>
          <div className="page-subtitle">Penjelasan singkat tiap menu &amp; istilah di Panel Admin</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {SECTIONS.map((s) => (
          <div className="card" key={s.title}>
            <div className="card-body" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: s.intro ? 6 : 12 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{s.title}</h3>
              </div>
              {s.intro && (
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                  {s.intro}
                </p>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
                {s.items.map((it) => (
                  <div key={it.term} style={{ borderLeft: '3px solid var(--primary-light)', paddingLeft: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{it.term}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{it.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.06), rgba(249,115,22,0.02))', border: '1px solid rgba(249,115,22,0.2)' }}>
          <div className="card-body" style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <HelpCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--primary)' }}>Tips:</strong> Isi <strong>Harga Modal</strong> dan
              nyalakan <strong>Lacak Stok</strong> pada produk agar laporan <strong>Laba Rugi</strong> dan
              peringatan <strong>Stok Minimum</strong> berjalan akurat.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
