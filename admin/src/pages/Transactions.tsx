import { useEffect, useState } from 'react';
import axios from 'axios';
import { Receipt, Search, Eye, XCircle, Wallet, TrendingUp, Ban } from 'lucide-react';
import { toast } from '../ui/feedback';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const paymentLabel: Record<string, string> = {
  cash: '💵 Tunai', qris: '📱 QRIS', card: '💳 Kartu', ewallet: '📲 E-Wallet',
};

export default function Transactions() {
  const [trx, setTrx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voidFilter, setVoidFilter] = useState(''); // '', '0', '1'
  const [detail, setDetail] = useState<any>(null);
  const [voiding, setVoiding] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

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

  const activeTrx = trx.filter(t => !t.is_void);
  const totalOmzet = activeTrx.reduce((sum, t) => sum + Number(t.grand_total || 0), 0);
  const voidCount = trx.filter(t => t.is_void).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Transaksi</div>
          <div className="page-subtitle">Rincian seluruh transaksi kasir — filter, lihat detail, dan kelola pembatalan</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="stat-card indigo">
          <div className="stat-card-header"><div className="stat-card-icon indigo"><TrendingUp size={20} /></div></div>
          <div className="stat-value">{fmt(totalOmzet)}</div>
          <div className="stat-label">Total Omzet (sesuai filter)</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-header"><div className="stat-card-icon blue"><Wallet size={20} /></div></div>
          <div className="stat-value">{activeTrx.length}</div>
          <div className="stat-label">Transaksi Selesai</div>
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
              <option value="0">Selesai</option>
              <option value="1">Void</option>
            </select>
            <div className="search-input-wrapper" style={{ minWidth: 200 }}>
              <Search size={15} />
              <input className="search-input" placeholder="Cari struk/kasir/pelanggan..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>No. Struk</th><th>Tanggal</th><th>Kasir</th><th>Pelanggan</th>
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
                    <td><span style={{ fontWeight: 700, color: 'var(--primary)' }}>#{t.receipt_number}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtDateTime(t.created_at)}</td>
                    <td>{t.employee_name || '-'}</td>
                    <td>{t.customer_name || <span style={{ color: 'var(--text-muted)' }}>Umum</span>}</td>
                    <td>
                      <span className={`badge ${t.payment_method === 'cash' ? 'badge-green' : 'badge-blue'}`}>
                        {paymentLabel[t.payment_method] || t.payment_method || '-'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(t.grand_total)}</td>
                    <td>
                      <span className={`badge ${t.is_void ? 'badge-red' : 'badge-green'}`}>
                        {t.is_void ? 'Void' : 'Selesai'}
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
              <div className="modal-title">🧾 Struk #{detail.receipt_number}</div>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{fmtDateTime(detail.created_at)}</span>
                <span>Kasir: <strong style={{ color: 'var(--text-primary)' }}>{detail.employee_name || '-'}</strong></span>
              </div>

              {detail.is_void && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
                  <strong style={{ color: 'var(--danger)' }}>DIBATALKAN (VOID)</strong>
                  <div>Alasan: {detail.void_reason || '-'}</div>
                  <div>Oleh: {detail.void_by || '-'}</div>
                </div>
              )}

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
                <Row label={`Dibayar (${paymentLabel[detail.payment_method] || detail.payment_method || '-'})`} value={fmt(detail.cash_amount)} />
                <Row label="Kembalian" value={fmt(detail.change_amount)} />
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
                <label className="form-label">Alasan pembatalan (opsional)</label>
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
