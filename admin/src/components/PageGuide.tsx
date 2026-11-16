import { HelpCircle } from 'lucide-react';

type Guide = { purpose: string; steps: string[]; terms?: { name: string; meaning: string }[] };

export const pageGuides: Record<string, Guide> = {
  '/dashboard': {
    purpose: 'Alur dari menu dan stok hingga pembayaran dan laba toko.',
    steps: [
      'Mulai dari Kelola Menu: isi harga jual, harga modal, kategori, dan pengaturan stok produk.',
      'Catat pembelian. Barang masuk ke stok gudang, lalu pindahkan jumlah yang akan dijual ke stok kasir.',
      'Waiter atau kasir membuat pesanan di APK. Kasir memeriksa item yang terantar sebelum mengonfirmasi pembayaran.',
      'Transaksi lunas masuk ke penjualan. Biaya Operasional dan harga modal ikut dihitung di Laba Rugi.',
      'Periksa stok menipis dan selisih fisik; gunakan Riwayat Stok untuk mencari asal perubahannya.',
    ],
    terms: [
      { name: 'Omzet', meaning: 'Jumlah penjualan yang sudah lunas dalam periode yang ditampilkan.' },
      { name: 'Stok menipis', meaning: 'Produk yang jumlah stok kasirnya mencapai atau melewati batas minimum.' },
    ],
  },
  '/transactions': {
    purpose: 'Cari pesanan, lihat pembuatnya, dan periksa status pembayaran.',
    steps: ['Cari nama transaksi atau nomor struk, lalu periksa nama pembuat pesanan.', 'Pesanan baru berstatus belum dibayar. Kasir menandai item terantar di APK dan mengonfirmasi pembayaran.', 'Kasir dapat melakukan Void dengan alasan. Void mengembalikan stok dan membalik poin pelanggan.', 'Hanya SuperAdmin yang dapat menghapus permanen transaksi yang sudah Void. Ketik nomor struk dan alasan pada dialog konfirmasi.'],
    terms: [
      { name: 'Sudah bayar', meaning: 'Kasir telah mengonfirmasi pembayaran.' },
      { name: 'Void', meaning: 'Transaksi dibatalkan; stok yang terkait dikembalikan.' },
      { name: 'Uang lebih', meaning: 'Selisih uang tunai yang tidak diambil pelanggan, dicatat terpisah dari kembalian.' },
    ],
  },
  '/laba-rugi': {
    purpose: 'Bandingkan pendapatan, modal barang, dan biaya operasional.',
    steps: ['Pilih rentang tanggal yang ingin diperiksa.', 'Periksa penjualan lunas, harga modal produk, dan catatan biaya bila hasil tidak sesuai.'],
    terms: [
      { name: 'HPP', meaning: 'Harga modal barang yang terjual dalam periode laporan.' },
      { name: 'Laba bersih', meaning: 'Pendapatan dikurangi HPP dan biaya operasional.' },
    ],
  },
  '/products': {
    purpose: 'Atur menu yang muncul di aplikasi kasir dan waiter.',
    steps: ['Buat kategori, lalu tambahkan produk dengan harga jual, harga modal, dan satuan.', 'Aktifkan lacak stok dan isi batas minimum bila persediaan perlu dihitung.', 'SuperAdmin dapat memilih penitip lalu mengatur margin toko sebagai persen penjualan atau nominal Rp per item.'],
    terms: [
      { name: 'Harga modal', meaning: 'Biaya barang yang dipakai untuk menghitung HPP.' },
      { name: 'Lacak stok', meaning: 'Jumlah stok berkurang saat produk terjual.' },
      { name: 'SKU / barcode', meaning: 'Kode produk untuk pencarian atau pemindaian.' },
    ],
  },
  '/stocking': {
    purpose: 'Pantau stok gudang dan stok yang siap dijual di kasir.',
    steps: ['Cari produk untuk membandingkan jumlah di gudang dan kasir.', 'Gunakan Keluarkan ke Kasir sebelum barang dijual di aplikasi.', 'Gunakan Sesuaikan untuk koreksi stok gudang dan isi alasannya.'],
    terms: [
      { name: 'Stok gudang', meaning: 'Barang simpanan yang belum siap dijual kasir.' },
      { name: 'Stok kasir', meaning: 'Barang di area jual yang dipakai untuk pesanan.' },
    ],
  },
  '/stock-ledger': {
    purpose: 'Telusuri alasan dan pelaku setiap perubahan stok.',
    steps: ['Saring produk, tanggal, jenis mutasi, atau referensi.', 'Cocokkan jumlah dan nama petugas dengan penjualan, pembelian, transfer, atau opname fisik.'],
    terms: [{ name: 'Referensi', meaning: 'Asal perubahan stok, misalnya penjualan, PO, void, opname, atau penyesuaian manual.' }],
  },
  '/suppliers': {
    purpose: 'Simpan kontak pemasok untuk pembelian barang.',
    steps: ['Tambahkan nama pemasok dan kontak yang bisa dihubungi.', 'Pilih pemasok tersebut saat membuat PO di halaman Pembelian.'],
    terms: [{ name: 'PIC', meaning: 'Orang yang menjadi kontak utama di pemasok.' }],
  },
  '/purchases': {
    purpose: 'Catat pesanan barang dari supplier.',
    steps: ['Buat PO dengan memilih supplier, item, jumlah, dan harga.', 'Periksa status Dipesan dan Diterima pada daftar PO.', 'Saat barang diterima, cocokkan jumlah fisik dengan PO sebelum pencatatan stok.'],
    terms: [{ name: 'PO', meaning: 'Pesanan pembelian barang kepada supplier.' }],
  },
  '/expenses': {
    purpose: 'Catat pengeluaran yang mengurangi laba toko.',
    steps: ['Tambahkan tanggal, kategori, nominal, dan metode pembayaran biaya.', 'Periksa kembali daftar biaya sebelum membaca Laba Rugi.'],
    terms: [{ name: 'Biaya operasional', meaning: 'Pengeluaran di luar harga modal barang, misalnya sewa, listrik, atau transport.' }],
  },
  '/consignors': {
    purpose: 'Kelola pemilik barang titipan dan pembagian hasilnya.',
    steps: ['Tambahkan identitas dan kontak pemilik barang titipan.', 'SuperAdmin membuka Kelola Menu untuk menautkan produk ke penitip dan memilih margin persen atau nominal per item.', 'Pilih bulan untuk melihat jumlah item terjual, margin toko, dan bagian penitip. Bulan tanpa penjualan bernilai Rp0.'],
    terms: [{ name: 'Margin toko', meaning: 'Bagian toko dari setiap item terjual. Sisanya menjadi bagian penitip.' }],
  },
  '/employees': {
    purpose: 'Buat akses karyawan aplikasi dan admin web.',
    steps: ['Pilih peran: waiter membuat pesanan, kasir menutup tagihan, petugas stok mengelola persediaan, admin web mengelola halaman yang diizinkan.', 'Berikan PIN berbeda untuk setiap akun aplikasi. Admin web memakai email dan password.', 'Nonaktifkan akun anggota yang tidak lagi bertugas; gunakan Reset PIN bila anggota lupa PIN.'],
    terms: [{ name: 'Izin halaman', meaning: 'Daftar halaman portal yang boleh dibuka oleh admin web tertentu.' }],
  },
};

export default function PageGuide({ path }: { path: string }) {
  const guide = pageGuides[path];
  if (!guide) return null;

  return (
    <details className="page-guide" key={path}>
      <summary className="page-guide-summary">
        <HelpCircle size={19} aria-hidden="true" />
        <span className="page-guide-text"><strong>Panduan halaman</strong><span>{guide.purpose}</span></span>
        <span className="page-guide-toggle" aria-hidden="true">Lihat langkah</span>
      </summary>
      <ol className="page-guide-steps">
        {guide.steps.map(step => <li key={step}>{step}</li>)}
      </ol>
      {guide.terms && <dl className="page-guide-terms">
        {guide.terms.map(term => <div key={term.name}><dt>{term.name}</dt><dd>{term.meaning}</dd></div>)}
      </dl>}
    </details>
  );
}
