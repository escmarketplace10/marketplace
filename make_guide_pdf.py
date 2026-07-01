# -*- coding: utf-8 -*-
"""Membuat PDF panduan penggunaan POS ESC."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable,
    ListItem, HRFlowable, PageBreak, KeepTogether, Image
)

LOGO_PATH = "D:/POS ESC/mobile/assets/logo.png"

BLUE = colors.HexColor("#2563EB")
ORANGE = colors.HexColor("#F97316")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
BG = colors.HexColor("#F1F5F9")
GREEN = colors.HexColor("#16A34A")
RED = colors.HexColor("#DC2626")

styles = getSampleStyleSheet()

def S(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

h_title = S("h_title", fontName="Helvetica-Bold", fontSize=30, textColor=BLUE, leading=34, alignment=TA_CENTER)
h_sub = S("h_sub", fontName="Helvetica", fontSize=13, textColor=MUTED, alignment=TA_CENTER, leading=18)
h1 = S("h1", fontName="Helvetica-Bold", fontSize=17, textColor=colors.white, leading=22, spaceBefore=6, spaceAfter=8, leftIndent=8)
h2 = S("h2", fontName="Helvetica-Bold", fontSize=13, textColor=BLUE, leading=18, spaceBefore=10, spaceAfter=4)
body = S("body", fontSize=10.5, textColor=INK, leading=15, spaceAfter=4)
small = S("small", fontSize=9, textColor=MUTED, leading=13)
step = S("step", fontSize=10.5, textColor=INK, leading=15, spaceAfter=2)
note = S("note", fontSize=10, textColor=INK, leading=14)

def section_header(text):
    """Bar judul berwarna."""
    t = Table([[Paragraph(text, h1)]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BLUE),
        ("TOPPADDING", (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("ROUNDEDCORNERS", [6,6,6,6]),
    ]))
    return t

def steps(items):
    return ListFlowable(
        [ListItem(Paragraph(it, step), value=i+1) for i, it in enumerate(items)],
        bulletType="1", leftIndent=18, bulletFontName="Helvetica-Bold", bulletColor=BLUE,
    )

def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(it, body), leftIndent=6) for it in items],
        bulletType="bullet", leftIndent=16, bulletColor=ORANGE, bulletFontSize=8,
    )

def callout(text, color=ORANGE, label="PENTING"):
    inner = Table([[Paragraph(f"<b>{label}.</b> {text}", note)]], colWidths=[164*mm])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#FFF7ED") if color==ORANGE else colors.HexColor("#FEF2F2")),
        ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LINEBEFORE", (0,0), (0,-1), 3, color),
    ]))
    return inner

story = []

# ---------- HALAMAN JUDUL ----------
story.append(Spacer(1, 60))
wrap = Table([[Image(LOGO_PATH, width=86, height=86)]], colWidths=[170*mm])
wrap.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER")]))
story.append(wrap)
story.append(Spacer(1, 22))
story.append(Paragraph("Kantinku", h_title))
story.append(Spacer(1, 6))
story.append(Paragraph("Panduan Penggunaan Aplikasi Kasir Android", h_sub))
story.append(Spacer(1, 40))
intro = Table([[Paragraph(
    "Aplikasi kasir (Point of Sale) untuk HP &amp; tablet Android. Aplikasi terhubung ke "
    "<b>server di satu PC</b> melalui <b>WiFi lokal</b>. Semua data penjualan tersimpan di PC tersebut.", note)]],
    colWidths=[150*mm])
intro.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),BG),("LEFTPADDING",(0,0),(-1,-1),14),("RIGHTPADDING",(0,0),(-1,-1),14),("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),12),("ALIGN",(0,0),(-1,-1),"CENTER")]))
wrap2 = Table([[intro]], colWidths=[170*mm]); wrap2.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER")]))
story.append(wrap2)
story.append(Spacer(1, 30))
story.append(Paragraph("Versi 1.0", S("v", fontSize=10, textColor=MUTED, alignment=TA_CENTER)))
story.append(PageBreak())

# ---------- 1. CARA KERJA ----------
story.append(section_header("1. Cara Kerja Sistem"))
story.append(Spacer(1, 6))
story.append(Paragraph("Sistem terdiri dari dua bagian:", body))
story.append(bullets([
    "<b>Server (PC kasir utama)</b> — program yang menyimpan seluruh data (produk, transaksi, stok). Harus menyala selama berjualan.",
    "<b>Aplikasi (HP/Tablet)</b> — tempat kasir melayani transaksi. Bisa dipasang di banyak perangkat sekaligus.",
]))
story.append(Spacer(1, 6))
diagram = Table([
    [Paragraph("PC SERVER", S("d1", fontName="Helvetica-Bold", fontSize=11, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph("WiFi", S("d2", fontName="Helvetica-Bold", fontSize=10, textColor=MUTED, alignment=TA_CENTER)),
     Paragraph("HP / TABLET", S("d3", fontName="Helvetica-Bold", fontSize=11, textColor=colors.white, alignment=TA_CENTER))],
], colWidths=[60*mm, 40*mm, 60*mm], rowHeights=[28])
diagram.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(0,0),INK), ("BACKGROUND",(2,0),(2,0),ORANGE),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"), ("ROUNDEDCORNERS",[8,8,8,8]),
]))
story.append(diagram)
story.append(Spacer(1, 10))
story.append(callout("HP/Tablet dan PC <b>wajib berada di jaringan WiFi yang sama</b>.", ORANGE, "SYARAT"))

# ---------- 2. MENYALAKAN SERVER ----------
story.append(Spacer(1, 14))
story.append(section_header("2. Menyalakan Server di PC"))
story.append(Spacer(1, 6))
story.append(steps([
    "Buka folder <b>D:\\POS ESC</b> di PC.",
    "Klik dua kali file <b>JALANKAN-SERVER.bat</b>.",
    "Akan muncul jendela hitam berisi alamat server, contoh: <b>http://192.168.1.17:3001</b>. <b>Catat alamat ini.</b>",
    "Biarkan jendela tersebut <b>tetap terbuka</b> selama berjualan. Menutupnya akan mematikan server.",
]))
story.append(Spacer(1, 4))
story.append(callout("Jika Windows menanyakan izin firewall saat pertama kali, pilih <b>Allow / Izinkan</b> (jaringan Private). Tanpa ini, HP tidak bisa terhubung.", RED, "JANGAN LEWATKAN"))

# ---------- 3. MEMASANG APLIKASI ----------
story.append(Spacer(1, 14))
story.append(section_header("3. Memasang Aplikasi di HP/Tablet"))
story.append(Spacer(1, 6))
story.append(steps([
    "Salin file <b>Kantinku.apk</b> dari folder D:\\POS ESC ke HP (lewat kabel USB, WhatsApp ke diri sendiri, atau Google Drive).",
    "Buka file APK di HP. Bila muncul peringatan, aktifkan <b>\"Izinkan dari sumber ini\"</b> / \"Install sumber tidak dikenal\".",
    "Tekan <b>Install</b>, lalu buka aplikasinya.",
]))

# ---------- 4. SETUP & LOGIN ----------
story.append(Spacer(1, 14))
story.append(section_header("4. Pengaturan Awal &amp; Masuk"))
story.append(Spacer(1, 6))
story.append(Paragraph("Saat pertama kali dibuka, aplikasi meminta alamat server:", body))
story.append(steps([
    "Di layar <b>Setup Server</b>, ketik alamat dari langkah 2 (mis. http://192.168.1.17:3001).",
    "Tekan <b>Sambungkan</b>. Bila berhasil, lanjut ke layar Login.",
    "Masukkan <b>PIN</b> karyawan untuk masuk.",
]))
story.append(Spacer(1, 6))
story.append(Paragraph("PIN Login Awal", h2))
pin_tbl = Table([
    [Paragraph("<b>Peran</b>", small), Paragraph("<b>PIN</b>", small), Paragraph("<b>Akses</b>", small)],
    [Paragraph("Admin", body), Paragraph("123456", body), Paragraph("Semua menu", small)],
], colWidths=[35*mm, 30*mm, 105*mm])
pin_tbl.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),BLUE), ("TEXTCOLOR",(0,0),(-1,0),colors.white),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, BG]),
    ("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#E2E8F0")),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("TOPPADDING",(0,0),(-1,-1),6), ("BOTTOMPADDING",(0,0),(-1,-1),6),
    ("LEFTPADDING",(0,0),(-1,-1),8),
]))
story.append(pin_tbl)
story.append(Spacer(1, 4))
story.append(Paragraph("Aplikasi mulai dengan data kosong. Setelah login Admin, tambahkan <b>kategori &amp; menu</b> (menu Kelola Menu) dan <b>karyawan lain</b> beserta PIN-nya (menu Karyawan).", small))

story.append(PageBreak())

# ---------- 5. PANDUAN FITUR ----------
story.append(section_header("5. Panduan Per Menu"))
story.append(Spacer(1, 8))

def feature(title, desc, items):
    block = [Paragraph(title, h2), Paragraph(desc, body), bullets(items), Spacer(1, 6)]
    return KeepTogether(block)

story.append(feature("Kasir (POS)", "Melayani penjualan sehari-hari.", [
    "Pilih kategori, ketuk produk untuk menambah ke keranjang; ubah jumlah dengan tombol +/−.",
    "Isi <b>No. Meja / Nama / Plat</b> bila perlu, dan pilih tipe: Dine In / Take Away / Delivery.",
    "Beri <b>diskon %</b> dan pilih/buat <b>pelanggan</b> bila ada.",
    "Tekan <b>BAYAR</b> → pilih metode (Tunai/QRIS/Kartu/E-Wallet).",
    "<b>Atur Kembalian</b> (tunai): ketik uang diterima atau tekan tombol <b>pecahan cepat</b> (+1rb, +5rb, +50rb, dst) untuk menjumlah; <b>kembalian tampil otomatis</b>. Tombol pecahan bisa diatur lewat ikon “Atur pecahan”.",
    "Bila shift belum dibuka, aplikasi meminta membuka shift (isi modal awal) terlebih dahulu.",
]))
story.append(feature("Kelola Menu", "Mengatur daftar menu (oleh Admin/Manager).", [
    "Buat <b>kategori</b> (tombol “Kategori”); tahan lama sebuah kategori untuk menghapus (jika sudah kosong).",
    "Tekan <b>Tambah Menu</b> untuk menambah produk: <b>foto</b> (ketuk kotak foto untuk pilih dari galeri), nama, kategori, harga jual, modal, dan stok.",
    "Tiap menu punya tombol <b>Edit</b> dan <b>Hapus</b> (dengan konfirmasi). Menu yang dihapus hilang dari kasir.",
]))
story.append(feature("Shift", "Membuka & menutup kas.", [
    "<b>Buka Shift</b>: isi modal awal (uang di laci) saat mulai berjualan.",
    "<b>Tutup Shift</b>: aplikasi menghitung kas seharusnya; isi kas aktual untuk melihat selisih.",
]))
story.append(feature("Dapur (KDS)", "Layar pesanan untuk staf dapur.", [
    "Pesanan tampil di kolom <b>Baru</b> → tekan untuk pindah ke <b>Dimasak</b> → <b>Siap</b> → Selesai.",
    "Layar menyegar otomatis setiap beberapa detik.",
]))
story.append(feature("Stok", "Pantau & sesuaikan persediaan.", [
    "Ketuk produk untuk menambah (Masuk), mengurangi (Keluar), atau menetapkan (Set) jumlah stok.",
    "Filter <b>Stok menipis</b> menampilkan produk yang mendekati batas minimum.",
]))
story.append(feature("Transaksi", "Riwayat penjualan.", [
    "Ketuk satu transaksi untuk melihat rincian item & pembayaran.",
    "Manager/Admin dapat <b>membatalkan (void)</b> transaksi; stok akan dikembalikan otomatis.",
]))
story.append(feature("Pelanggan (CRM)", "Database pelanggan & loyalitas.", [
    "Tambah/edit pelanggan, lihat <b>poin</b> & <b>tier</b>, serta tambahkan <b>saldo deposit</b>.",
]))
story.append(feature("Dashboard &amp; Laporan", "Analisa bisnis.", [
    "<b>Dashboard</b>: omzet hari ini, jumlah transaksi, produk terlaris, grafik 7 hari.",
    "<b>Laporan</b>: Laba Rugi, metode pembayaran, analisis ABC, jam sibuk.",
]))
story.append(feature("Karyawan, Supplier, Pembelian &amp; Biaya", "Manajemen operasional.", [
    "<b>Karyawan</b>: kelola staf, peran, PIN, komisi.",
    "<b>Supplier &amp; Pembelian (PO)</b>: buat pesanan ke supplier; tekan <b>Terima</b> untuk menambah stok otomatis.",
    "<b>Biaya</b>: catat pengeluaran operasional (listrik, sewa, gaji, dll).",
]))

story.append(PageBreak())

# ---------- 6. MASALAH UMUM ----------
story.append(section_header("6. Mengatasi Masalah Koneksi"))
story.append(Spacer(1, 8))
story.append(Paragraph("Jika HP/Tablet tidak bisa terhubung ke server:", body))
story.append(steps([
    "Pastikan PC &amp; HP berada di <b>WiFi yang sama</b>.",
    "Pastikan jendela <b>JALANKAN-SERVER</b> di PC masih terbuka.",
    "Izinkan <b>Windows Firewall</b>: Windows Security → Firewall &amp; network protection → Allow an app through firewall → centang <b>Node.js</b> (profil Private). Atau buka port <b>3001</b>.",
    "Tes dari browser HP: buka <b>http://&lt;IP-PC&gt;:3001/api/health</b> — harus muncul tulisan <b>{\"status\":\"ok\"}</b>.",
    "Bila IP PC berubah (ganti WiFi/restart), buka kembali <b>Setup Server</b> di aplikasi dan masukkan alamat yang baru.",
]))
story.append(Spacer(1, 12))
story.append(section_header("7. Catatan Penting"))
story.append(Spacer(1, 8))
story.append(bullets([
    "Seluruh data tersimpan di PC pada file <b>backend\\data\\pos.db</b>. Lakukan <b>backup berkala</b> dengan menyalin file tersebut.",
    "Koneksi memakai jaringan lokal (tanpa internet) sehingga gratis &amp; tetap jalan saat internet mati.",
    "Satu server dapat melayani banyak HP/tablet sekaligus (kasir, dapur, dll).",
]))
story.append(Spacer(1, 18))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
story.append(Spacer(1, 6))
story.append(Paragraph("Kantinku — Panduan Penggunaan • Dokumen ini dibuat otomatis.", S("foot", fontSize=8.5, textColor=MUTED, alignment=TA_CENTER)))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(A4[0]/2, 12*mm, f"Kantinku  •  Halaman {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    "D:/POS ESC/Panduan-Penggunaan-Kantinku.pdf", pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm,
    title="Panduan Penggunaan Kantinku", author="Kantinku",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("OK: Panduan-Penggunaan-Kantinku.pdf")
