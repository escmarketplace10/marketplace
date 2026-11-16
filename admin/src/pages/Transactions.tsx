import { useEffect, useState } from 'react';
import axios from 'axios';
import { Receipt, Search, Eye, XCircle, Wallet, TrendingUp, Ban, Coins, Trash2 } from 'lucide-react';
import { toast } from '../ui/feedback';
import { isSuperAdmin } from '../lib/perms';
import { paymentMethodLabel, transactionDate, transactionStatus, transactionTitle } from '../lib/transactionDisplay';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function Transactions() {
  const [trx, setTrx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voidFilter, setVoidFilter] = useState(''); // '', '0', '1'
  const [detail, setDetail] = useState<any>(null);
  const [voiding, setVoiding] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmReceipt, setConfirmReceipt] = useState('');
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (search) params.search = search;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate + 'T23:59:59';
      if (voidFilter !== '') params.is_void = voidFilter;
      const r = await axios.get('/api/transactions', { headers, params });
      setTrx(r.data);
    } catch { setTrx([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [startDate, endDate, voidFilter]);
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openDetail = async (id: string) => {
    try {
      const r = await axios.get(`/api/transactions/${id}`, { headers });
      setDetail(r.data);
    } catch (e: any) {
      toast(e.response?.data?.error || 'Gagal memuat detail transaksi', 'error');
    }
  };

  const openVoidModal = () => { setVoidReason(''); setShowVoidModal(true); };

  const confirmVoid = async () => {
    if (!voidReason.trim()) { toast('Alasan pembatalan wajib diisi.', 'error'); return; }
    setVoiding(true);
    try {
      await axios.post(`/api/transactions/${detail.id}/void`, { reason: voidReason.trim() }, { headers });
      setShowVoidModal(false);
      setDetail(null);
      toast('Transaksi dibatalkan (void).', 'success');
      load();
    } catch (e: any) {
      toast(e.response?.data?.error || 'Gagal membatalkan transaksi', 'error');
    } finally {
      setVoiding(false);
    }
  };

  const confirmDelete = async () => {
    if (!detail || !detail.is_void || !isSuperAdmin()) return;
    if (deleteReason.trim().length < 10 || confirmReceipt.trim() !== detail.receipt_number) {
      toast('Isi alasan minimal 10 karakter dan ketik nomor struk dengan tepat.', 'error');
      return;
    }
    setDeleting(true);
    try {
      await axios.delete(`/api/transactions/${detail.id}`, { headers, data: {
        reason: deleteReason.trim(), confirm_receipt_number: confirmReceipt.trim(),
      } });
      setShowDeleteModal(false);
      setDetail(null);
      toast('Transaksi Void dihapus permanen.', 'success');
      load();
    } catch (e: any) {
      toast(e.response?.data?.error || 'Gagal menghapus transaksi.', 'error');
    } finally { setDeleting(false); }
  };

  const activeTrx = trx.filter(t => !t.is_void && t.payment_status === 'completed');
  const totalOmzet = activeTrx.reduce((sum, t) => sum + Number(t.grand_total || 0), 0);
  const totalUangLebih = activeTrx.reduce((sum, t) => sum + Number(t.overpay_amount || 0), 0);
  const voidCount = trx.filter(t => t.is_void).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Transaksi</div>
          <div className="page-subtitle">Rincian seluruh transaksi kasir — filter, lihat detail, dan kelola pembatalan</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        <div className="stat-card indigo">
          <div className="stat-card-header"><div className="stat-card-icon indigo"><TrendingUp size={20} /></div></div>
          <div className="stat-value">{fmt(totalOmzet)}</div>
          <div className="stat-label">Total Omzet (sesuai filter)</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-header"><div className="stat-card-icon blue"><Wallet size={20} /></div></div>
          <div className="stat-value">{activeTrx.length}</div>
          <div className="stat-label">Transaksi Sudah Bayar</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-header"><div className="stat-card-icon amber"><Coins size={20} /></div></div>
          <div className="stat-value">{fmt(totalUangLebih)}</div>
          <div className="stat-label">Uang Lebih (sesuai filter)</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-card-header"><div className="stat-card-icon rose"><Ban size={20} /></div></div>
          <div className="stat-value">{voidCount}</div>
          <div className="stat-label">Transaksi Void</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Receipt size={17} color="var(--primary)" /> Daftar Transaksi</div>
          <div className="filter-bar" style={{ margin: 0 }}>
            <input type="date" className="form-input" style={{ width: 150 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <input type="date" className="form-input" style={{ width: 150 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            <select className="form-select" style={{ width: 150 }} value={voidFilter} onChange={e => setVoidFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="0">Tidak Void</option>
              <option value="1">Void</option>
            </select>
            <div className="search-input-wrapper" style={{ minWidth: 200 }}>
              <Search size={15} />
              <input className="search-input" placeholder="Cari nama transaksi, struk, petugas..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Transaksi / Struk</th><th>Tanggal</th><th>Dibuat oleh</th><th>Pelanggan</th>
                  <th>Pembayaran</th><th>Total</th><th>Status</th><th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {trx.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><div className="empty-state-icon">🧾</div><h3>Tidak ada transaksi</h3><p>Coba ubah rentang tanggal atau filter pencarian</p></div>
                  </td></tr>
                ) : trx.map(t => (
                  <tr key={t.id}>
                    <td><strong>{transactionTitle(t)}</strong><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{t.receipt_number}</div></td>
                    <td style={{ color: 'var(--text-muted)' }}>{transactionDate(t.created_at)}</td>
                    <td>{t.employee_name || '-'}</td>
                    <td>{t.customer_name || <span style={{ color: 'var(--text-muted)' }}>Umum</span>}</td>
                    <td>
                      {paymentMethodLabel(t)}
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(t.grand_total)}</td>
                    <td>
                      <span className={`badge ${transactionStatus(t).badge}`}>
                        {transactionStatus(t).label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetail(t.id)}><Eye size={13} /> Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{transactionTitle(detail)} <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>#{detail.receipt_number}</span></div>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{transactionDate(detail.created_at)}</span>
                <span>Dibuat oleh: <strong style={{ color: 'var(--text-primary)' }}>{detail.employee_name || '-'}</strong></span>
              </div>

              {detail.is_void && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
                  <strong style={{ color: 'var(--danger)' }}>DIBATALKAN (VOID)</strong>
                  <div>Alasan: {detail.void_reason || '-'}</div>
                  <div>Oleh: {detail.void_by || '-'}</div>
                </div>
              )}
              {!detail.is_void && <div className={`badge ${transactionStatus(detail).badge}`} style={{ marginBottom: 14 }}>
                {transactionStatus(detail).label}
              </div>}

              <div className="table-container" style={{ marginBottom: 16 }}>
                <table>
                  <thead><tr><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr></thead>
                  <tbody>
                    {(detail.items || []).map((it: any) => (
                      <tr key={it.id}>
                        <td>
                          {it.product_name}
                          {it.notes && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>{it.notes}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(it.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Row label="Tipe Pesanan" value={`${detail.order_type || '-'}${detail.order_reference ? ` · ${detail.order_reference}` : ''}`} />
                <Row label="Subtotal" value={fmt(detail.subtotal)} />
                <Row label="Diskon" value={`- ${fmt(detail.discount_total)}`} />
                {Number(detail.tax_total) > 0 && <Row label="Pajak" value={fmt(detail.tax_total)} />}
                <Row label="Total" value={fmt(detail.grand_total)} big />
                {detail.payment_status === 'completed' && <Row label={`Dibayar (${paymentMethodLabel(detail)})`} value={fmt(detail.cash_amount)} />}
                {detail.payment_status === 'completed' && <Row label="Kembalian" value={fmt(detail.change_amount)} />}
                {detail.payment_status === 'completed' && Number(detail.overpay_amount) > 0 && <Row label="Uang lebih (tidak diambil)" value={fmt(detail.overpay_amount)} />}
                {detail.notes && <Row label="Catatan" value={detail.notes} />}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Tutup</button>
              {!detail.is_void && (
                <button className="btn btn-danger" onClick={openVoidModal} disabled={voiding}>
                  <XCircle size={14} /> Batalkan (Void)
                </button>
              )}
              {detail.is_void && isSuperAdmin() && (
                <button className="btn btn-danger" onClick={() => { setDeleteReason(''); setConfirmReceipt(''); setShowDeleteModal(true); }}>
                  <Trash2 size={14} /> Hapus permanen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal alasan void — pengganti prompt() bawaan */}
      {showVoidModal && (
        <div className="modal-overlay" onClick={() => !voiding && setShowVoidModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Batalkan Transaksi</div>
              <button className="modal-close" onClick={() => setShowVoidModal(false)}><XCircle size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 0, lineHeight: 1.5 }}>
                Void mengembalikan stok & mengubah catatan keuangan. Tindakan ini tidak bisa dibatalkan.
              </p>
              <div className="form-group">
                <label className="form-label">Alasan pembatalan</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="Contoh: salah input, pesanan dibatalkan pelanggan"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVoidModal(false)} disabled={voiding}>Batal</button>
              <button className="btn btn-danger" onClick={confirmVoid} disabled={voiding}>
                <XCircle size={14} /> {voiding ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && detail?.is_void && isSuperAdmin() && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Hapus transaksi Void permanen</div>
              <button className="modal-close" aria-label="Tutup" onClick={() => setShowDeleteModal(false)} disabled={deleting}>×</button>
            </div>
            <div className="modal-body">
              <p>Struk dan item transaksi akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
              <div className="form-group">
                <label className="form-label" htmlFor="delete-receipt">Ketik nomor struk: {detail.receipt_number}</label>
                <input id="delete-receipt" className="form-input" value={confirmReceipt} onChange={e => setConfirmReceipt(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="delete-reason">Alasan penghapusan</label>
                <textarea id="delete-reason" className="form-input" rows={3} value={deleteReason} onChange={e => setDeleteReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Batal</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting || confirmReceipt.trim() !== detail.receipt_number || deleteReason.trim().length < 10}>
                <Trash2 size={14} /> {deleting ? 'Menghapus...' : 'Hapus permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: big ? 800 : 500, fontSize: big ? 16 : 13.5 }}>
      <span style={{ color: big ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: big ? 'var(--primary)' : 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
