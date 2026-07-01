import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, ShoppingCart, Search, Eye } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const statusBadge = (status: string) => {
  const map: Record<string, string> = { draft: 'badge-gray', ordered: 'badge-blue', received: 'badge-green', cancelled: 'badge-red' };
  const label: Record<string, string> = { draft: 'Draft', ordered: 'Dipesan', received: 'Diterima', cancelled: 'Dibatalkan' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{label[status] || status}</span>;
};

export default function Purchases() {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', notes: '' });
  const [items, setItems] = useState<any[]>([{ product_id: '', quantity: 1, unit_cost: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, prodRes] = await Promise.all([
        axios.get('/api/purchase-orders', { headers }),
        axios.get('/api/suppliers', { headers }),
        axios.get('/api/products', { headers }),
      ]);
      setOrders(poRes.data);
      setSuppliers(supRes.data);
      setProducts(prodRes.data);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => setItems(i => [...i, { product_id: '', quantity: 1, unit_cost: 0 }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx: number, key: string, val: any) => setItems(i => i.map((it, j) => j === idx ? { ...it, [key]: val } : it));

  const totalAmount = items.reduce((sum, it) => sum + (it.quantity * it.unit_cost), 0);

  const handleCreate = async () => {
    if (!form.supplier_id) return alert('Pilih supplier terlebih dahulu');
    if (items.some(it => !it.product_id || it.quantity <= 0)) return alert('Lengkapi semua item pembelian');
    setSubmitting(true);
    try {
      await axios.post('/api/purchase-orders', {
        ...form,
        items: items.map(it => ({ ...it, total_cost: it.quantity * it.unit_cost })),
        total_amount: totalAmount,
        status: 'ordered'
      }, { headers });
      setModal(false);
      setForm({ supplier_id: '', notes: '' });
      setItems([{ product_id: '', quantity: 1, unit_cost: 0 }]);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSubmitting(false); }
  };

  const filtered = orders.filter(o =>
    o.po_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Pembelian</div>
          <div className="page-subtitle">Catat dan pantau pemesanan barang dari supplier</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Buat Purchase Order</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total PO', val: orders.length, icon: '📋', color: 'indigo' },
          { label: 'Dipesan', val: orders.filter(o => o.status === 'ordered').length, icon: '🚚', color: 'amber' },
          { label: 'Diterima', val: orders.filter(o => o.status === 'received').length, icon: '✅', color: 'green' },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className={`stat-card ${color}`}>
            <div className="stat-card-header"><div className={`stat-card-icon ${color}`}><span style={{ fontSize: 22 }}>{icon}</span></div></div>
            <div className="stat-value">{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><ShoppingCart size={17} color="var(--primary)" /> Daftar Purchase Order</div>
          <div className="search-input-wrapper" style={{ minWidth: 220 }}>
            <Search size={15} />
            <input className="search-input" placeholder="Cari PO..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr><th>No. PO</th><th>Supplier</th><th>Tanggal</th><th>Total</th><th>Status</th><th style={{ textAlign: 'center' }}>Aksi</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📦</div><h3>Belum ada pembelian</h3><p>Buat Purchase Order pertama Anda</p></div></td></tr>
                ) : filtered.map(o => (
                  <tr key={o.id}>
                    <td><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{o.po_number}</span></td>
                    <td>{o.supplier_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(o.total_amount)}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-secondary btn-sm"><Eye size={13} /> Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🛒 Buat Purchase Order Baru</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Supplier *</label>
                <select className="form-select" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Item Pembelian *</label>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select className="form-select" style={{ marginBottom: 0 }} value={it.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                      <option value="">-- Pilih Produk --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" className="form-input" style={{ width: 80, marginBottom: 0 }} min={1} placeholder="Qty" value={it.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                    <input type="number" className="form-input" style={{ width: 120, marginBottom: 0 }} min={0} placeholder="Harga/unit" value={it.unit_cost} onChange={e => updateItem(idx, 'unit_cost', Number(e.target.value))} />
                    <button className="btn btn-danger btn-sm" onClick={() => removeItem(idx)} disabled={items.length <= 1}>✕</button>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={addItem} style={{ marginTop: 6 }}><Plus size={13} /> Tambah Item</button>
              </div>

              <div style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                  <span>Total Pembelian</span>
                  <span style={{ color: 'var(--primary)' }}>{fmt(totalAmount)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan (opsional)</label>
                <input className="form-input" placeholder="Catatan pemesanan..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Menyimpan...' : '✓ Buat PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
