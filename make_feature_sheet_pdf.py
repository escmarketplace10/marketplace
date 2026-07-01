# -*- coding: utf-8 -*-
"""Membuat PDF lembar fitur (sales sheet) Kantinku untuk ditunjukkan ke pembeli."""
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

ORANGE = colors.HexColor("#F97316")
ORANGE_DARK = colors.HexColor("#EA580C")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#6B7280")
BG = colors.HexColor("#F8FAFC")
LINE = colors.HexColor("#E5E7EB")
GREEN = colors.HexColor("#16A34A")
WHITE = colors.white

styles = getSampleStyleSheet()

def S(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

h_title = S("h_title", fontName="Helvetica-Bold", fontSize=32, textColor=INK, leading=36, alignment=TA_CENTER)
h_sub = S("h_sub", fontName="Helvetica", fontSize=13, textColor=MUTED, alignment=TA_CENTER, leading=18)
h1 = S("h1", fontName="Helvetica-Bold", fontSize=15, textColor=WHITE, leading=20, leftIndent=8)
h2 = S("h2", fontName="Helvetica-Bold", fontSize=11.5, textColor=ORANGE_DARK, leading=15, spaceBefore=2, spaceAfter=3)
body = S("body", fontSize=10, textColor=INK, leading=14.5, spaceAfter=3)
small = S("small", fontSize=9, textColor=MUTED, leading=13)
note = S("note", fontSize=10, textColor=INK, leading=14)
tag = S("tag", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE, alignment=TA_CENTER)

def section_header(text):
    t = Table([[Paragraph(text, h1)]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), INK),
        ("TOPPADDING", (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("ROUNDEDCORNERS", [6,6,6,6]),
    ]))
    return t

def bullets(items, color=ORANGE):
    return ListFlowable(
        [ListItem(Paragraph(it, body), leftIndent=6) for it in items],
        bulletType="bullet", leftIndent=16, bulletColor=color, bulletFontSize=8,
    )

def feature_card(title, desc, items):
    inner = [
        Paragraph(title, h2),
        Paragraph(desc, small),
        Spacer(1, 3),
        bullets(items),
    ]
    box = Table([[inner]], colWidths=[81*mm])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WHITE),
        ("BOX", (0,0), (-1,-1), 0.7, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ROUNDEDCORNERS", [8,8,8,8]),
    ]))
    return box

def two_col(a, b):
    t = Table([[a, b]], colWidths=[83*mm, 83*mm])
    t.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                           ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    return t

story = []

# ---------- HALAMAN 1: COVER ----------
story.append(Spacer(1, 36))
wrap = Table([[Image(LOGO_PATH, width=92, height=92)]], colWidths=[170*mm])
wrap.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER")]))
story.append(wrap)
story.append(Spacer(1, 18))
story.append(Paragraph("Kantinku", h_title))
story.append(Spacer(1, 4))
story.append(Paragraph("Aplikasi Kasir (POS) Android — Cepat, Lengkap, Tanpa Biaya Bulanan", h_sub))
story.append(Spacer(1, 22))

badges = Table([[
    Paragraph("APLIKASI ANDROID NATIVE", tag),
    Paragraph("TANPA INTERNET (WiFi LOKAL)", tag),
    Paragraph("TANPA BIAYA BULANAN", tag),
]], colWidths=[58*mm, 58*mm, 56*mm])
badges.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1),ORANGE),
    ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),
    ("ROUNDEDCORNERS",[20,20,20,20]),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
]))
bwrap = Table([[badges]], colWidths=[170*mm]); bwrap.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER")]))
story.append(bwrap)
story.append(Spacer(1, 26))

intro = Table([[Paragraph(
    "Kantinku adalah aplikasi kasir untuk HP &amp; tablet Android yang mencakup seluruh kebutuhan "
    "operasional usaha kuliner/retail kecil-menengah: dari transaksi penjualan, stok, barang titipan, "
    "hingga laporan keuangan — semua dalam satu aplikasi, berjalan di jaringan WiFi sendiri "
    "tanpa bergantung pada koneksi internet maupun biaya sewa bulanan.", note)]],
    colWidths=[150*mm])
intro.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),BG),("LEFTPADDING",(0,0),(-1,-1),16),("RIGHTPADDING",(0,0),(-1,-1),16),
                           ("TOPPADDING",(0,0),(-1,-1),14),("BOTTOMPADDING",(0,0),(-1,-1),14),("ALIGN",(0,0),(-1,-1),"CENTER"),
                           ("ROUNDEDCORNERS",[10,10,10,10])]))
iwrap = Table([[intro]], colWidths=[170*mm]); iwrap.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER")]))
story.append(iwrap)
story.append(PageBreak())

# ---------- HALAMAN 2-3: FITUR ----------
story.append(section_header("Fitur Utama"))
story.append(Spacer(1, 8))

row1 = two_col(
    feature_card("Kasir (POS)", "Layani transaksi dengan cepat.", [
        "Grid menu dengan foto, kategori &amp; pencarian.",
        "Keranjang, diskon, pilih tipe pesanan (Dine In/Take Away/Delivery).",
        "Pembayaran Tunai, QRIS, Kartu, E-Wallet.",
        "<b>Atur Kembalian otomatis</b> + pecahan uang cepat yang bisa diatur.",
    ]),
    feature_card("Kelola Menu", "Atur produk sendiri, kapan saja.", [
        "Tambah, edit, &amp; <b>hapus menu</b> dengan mudah.",
        "Upload <b>foto asli produk</b> dari galeri HP.",
        "Atur kategori, harga jual, modal, dan stok.",
    ]),
)
story.append(row1)
story.append(Spacer(1, 6))

row2 = two_col(
    feature_card("Manajemen Stok", "Kontrol persediaan barang.", [
        "Tambah, kurangi, atau set ulang stok.",
        "Notifikasi <b>stok menipis</b> otomatis.",
        "Stok berkurang/bertambah otomatis tiap transaksi/void.",
    ]),
    feature_card("Shift Kasir", "Kelola kas masuk-keluar per sesi.", [
        "Buka shift dengan modal awal.",
        "Tutup shift dengan rekap kas otomatis vs aktual.",
    ]),
)
story.append(row2)
story.append(Spacer(1, 6))

row3 = two_col(
    feature_card("Riwayat Transaksi", "Semua penjualan tercatat rapi.", [
        "Lihat detail tiap transaksi.",
        "Pembatalan (void) oleh Admin/Manager, stok kembali otomatis.",
    ]),
    feature_card("Pelanggan (CRM)", "Bangun loyalitas pelanggan.", [
        "Database pelanggan, riwayat belanja.",
        "Poin &amp; tier loyalitas otomatis.",
        "Saldo deposit pelanggan.",
    ]),
)
story.append(row3)
story.append(Spacer(1, 6))

row4 = two_col(
    feature_card("Dashboard &amp; Laporan", "Pantau performa bisnis.", [
        "Omzet harian, grafik 7 hari, produk terlaris.",
        "Laporan Laba Rugi, metode bayar, analisis ABC, jam sibuk.",
    ]),
    feature_card("Karyawan &amp; Hak Akses", "Kontrol siapa bisa apa.", [
        "Tambah staf dengan PIN masing-masing.",
        "Hak akses per peran (Admin/Manager/Kasir).",
        "Komisi karyawan.",
    ]),
)
story.append(row4)
story.append(Spacer(1, 6))

row5 = two_col(
    feature_card("Supplier, PO &amp; Biaya", "Operasional belakang toko.", [
        "Data supplier &amp; pemesanan barang (PO).",
        "Terima PO → stok bertambah otomatis.",
        "Catat biaya operasional (listrik, sewa, gaji, dll).",
    ]),
    feature_card("Penitip &amp; Komisi Titipan", "Kelola barang konsinyasi.", [
        "Tandai produk sebagai barang titipan dari penitip/pedagang.",
        "Komisi toko per produk, dihitung otomatis dari harga jual.",
        "Rekap belum disetor + riwayat setoran ke penitip.",
    ]),
)
story.append(row5)
story.append(PageBreak())

# ---------- HALAMAN 4: KEUNGGULAN ----------
story.append(section_header("Kenapa Pilih Kantinku"))
story.append(Spacer(1, 10))
story.append(bullets([
    "<b>Aplikasi Android asli</b> (bukan aplikasi web yang dibungkus) — ringan &amp; responsif di HP maupun tablet.",
    "<b>Tanpa biaya bulanan/sewa</b> — sekali pasang, milik sendiri selamanya.",
    "<b>Tanpa internet</b> — berjalan di WiFi lokal milik toko sendiri, tetap jalan saat internet mati.",
    "<b>Data milik sendiri</b> — tersimpan di perangkat/PC sendiri, bukan di server pihak ketiga.",
    "<b>Multi-perangkat</b> — satu server bisa dipakai banyak HP/tablet sekaligus (kasir, dapur, dll) secara bersamaan.",
    "<b>Tampilan modern &amp; mudah dipahami</b> — staf baru bisa langsung pakai tanpa pelatihan lama.",
    "<b>Bisa disesuaikan</b> — logo, warna, dan menu dapat dikustomisasi sesuai brand usaha.",
], GREEN))

story.append(Spacer(1, 14))
story.append(section_header("Spesifikasi Teknis"))
story.append(Spacer(1, 8))
spec_tbl = Table([
    [Paragraph("<b>Komponen</b>", small), Paragraph("<b>Keterangan</b>", small)],
    [Paragraph("Aplikasi kasir", body), Paragraph("Android 8.0 ke atas (HP &amp; tablet)", body)],
    [Paragraph("Server data", body), Paragraph("1 PC/laptop Windows, tanpa instalasi software tambahan", body)],
    [Paragraph("Koneksi", body), Paragraph("WiFi lokal (router rumah/toko biasa)", body)],
    [Paragraph("Database", body), Paragraph("Tersimpan otomatis di PC server", body)],
    [Paragraph("Kapasitas", body), Paragraph("Cocok untuk kantin, kafe, resto kecil-menengah, retail", body)],
], colWidths=[48*mm, 122*mm])
spec_tbl.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),INK), ("TEXTCOLOR",(0,0),(-1,0),WHITE),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE, BG]),
    ("GRID",(0,0),(-1,-1),0.5,LINE),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("TOPPADDING",(0,0),(-1,-1),7), ("BOTTOMPADDING",(0,0),(-1,-1),7),
    ("LEFTPADDING",(0,0),(-1,-1),8),
]))
story.append(spec_tbl)

story.append(Spacer(1, 18))
story.append(HRFlowable(width="100%", thickness=1, color=LINE))
story.append(Spacer(1, 6))
story.append(Paragraph("Kantinku — Solusi Kasir Digital untuk Usaha Anda", S("foot", fontSize=9, textColor=MUTED, alignment=TA_CENTER)))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(A4[0]/2, 12*mm, f"Kantinku  •  Halaman {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    "D:/POS ESC/Fitur-Kantinku.pdf", pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm,
    title="Fitur Kantinku", author="Kantinku",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("OK: Fitur-Kantinku.pdf")
