import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Package, ArrowUpDown } from 'lucide-react';
import { toast } from '../ui/feedback';

const DECIMAL_UNITS = new Set(['Kg', 'Mg', 'gram', 'liter', 'ml']);

const fmtStock = (n: number, unit?: string) => {
  if (unit && DECIMAL_UNITS.has(unit)) {
    if (n === Math.floor(n)) return new Intl.NumberFormat('id-ID').format(n);
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(n);
  }
  return new Intl.NumberFormat('id-ID').format(Math.floor(n));
};

export default function Stocking() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null); // { product, qty, type }
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/products', { headers });
      setProducts(res.data);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      await axios.post('/api/inventory/adjust', {
        product_id: modal.product.id,
        quantity: Math.abs(modal.qty),
        type: modal.type === 'in' ? 'in' : 'out',
        reason: modal.type === 'out' ? modal.reason : undefined,
        notes: modal.notes || undefined
      }, { headers });
      setModal(null);
      toast('Stok diperbarui.', 'success');
      load();
    } catch (e: any) {
      toast(e.response?.data?.error || 'Gagal menyimpan', 'error');
    } finally { setSubmitting(false); }
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock <= 0) return <span className="badge badge-red">Habis</span>;
    if (stock <= minStock) return <span className="badge badge-yellow">⚠ Rendah</span>;
    return <span className="badge badge-green">Tersedia</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Stok Barang</div>
          <div className="page-subtitle">Pantau dan kelola persediaan produk Anda</div>
        </div>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Produk', val: products.length, icon: '📦', color: 'indigo' },
          { label: 'Stok Rendah', val: products.filter(p => p.stock <= (p.min_stock || 0) && p.stock > 0).length, icon: '⚠️', color: 'amber' },
          { label: 'Stok Habis', val: products.filter(p => p.stock <= 0).length, icon: '🚫', color: 'rose' },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className={`stat-card ${color}`}>
            <div className="stat-card-header">
              <div className={`stat-card-icon ${color}`}><span style={{ fontSize: 22 }}>{icon}</span></div>
            </div>
            <div className="stat-value">{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Package size={17} color="var(--primary)" /> Daftar Stok Produk</div>
          <div className="filter-bar" style={{ margin: 0, gap: 10 }}>
            <div className="search-input-wrapper" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input className="search-input" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>SKU</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: 'center' }}>Stok Saat Ini</th>
                  <th style={{ textAlign: 'center' }}>Min. Stok</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Tidak ada produk ditemukan</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.sku || '-'}</span></td>
                    <td>{p.category_name || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: p.stock <= 0 ? 'var(--danger)' : p.stock <= (p.min_stock || 0) ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {fmtStock(p.stock, p.unit)} {p.unit}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{p.min_stock || 0}</td>
                    <td>{getStockBadge(p.stock, p.min_stock)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setModal({ product: p, qty: 1, type: 'in', notes: '', reason: 'koreksi' })}
                      >
                        <ArrowUpDown size={13} /> Sesuaikan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📦 Sesuaikan Stok — {modal.product.name}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                {[{ t: 'in', label: '➕ Stok Masuk' }, { t: 'out', label: '➖ Stok Keluar' }].map(({ t, label }) => (
                  <button
                    key={t}
                    className={`btn ${modal.type === t ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setModal((m: any) => ({ ...m, type: t }))}
                  >{label}</button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Stok Saat Ini</label>
                <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--primary)', padding: '8px 0' }}>
                  {fmtStock(modal.product.stock, modal.product.unit)} {modal.product.unit}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Jumlah {modal.type === 'in' ? 'Masuk' : 'Keluar'}</label>
                <input
                  type="number"
                  min={0}
                  step={DECIMAL_UNITS.has(modal.product.unit) ? '0.01' : '1'}
                  className="form-input"
                  value={modal.qty}
                  onChange={e => setModal((m: any) => ({ ...m, qty: Number(e.target.value) }))}
                />
              </div>
              {modal.type === 'out' && (
                <div className="form-group">
                  <label className="form-label">Alasan Barang Keluar</label>
                  <select
                    className="form-select"
                    value={modal.reason}
                    onChange={e => setModal((m: any) => ({ ...m, reason: e.target.value }))}
                  >
                    <option value="rusak">Barang Rusak</option>
                    <option value="hilang">Barang Hilang</option>
                    <option value="kadaluarsa">Kadaluarsa</option>
                    <option value="koreksi">Koreksi Stok</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Catatan (opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Alasan penyesuaian..."
                  value={modal.notes}
                  onChange={e => setModal((m: any) => ({ ...m, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleAdjust} disabled={submitting}>
                {submitting ? 'Menyimpan...' : '✓ Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
