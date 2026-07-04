import { useEffect, useState } from 'react';
import axios from 'axios';
import { History, ArrowDownCircle, ArrowUpCircle, Settings2 } from 'lucide-react';

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const TYPE_BADGE: Record<string, { cls: string; label: string; icon: any }> = {
  in: { cls: 'badge-green', label: 'Masuk', icon: ArrowDownCircle },
  out: { cls: 'badge-red', label: 'Keluar', icon: ArrowUpCircle },
  set: { cls: 'badge-gray', label: 'Set Manual', icon: Settings2 },
};

const REF_LABEL: Record<string, string> = {
  sale: '🛒 Penjualan',
  purchase: '📦 Pembelian (PO)',
  void: '↩️ Void Transaksi',
  opname: '🧮 Stock Opname',
  manual: '✋ Penyesuaian Manual',
};

export default function StockLedger() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 300 };
      if (productId) params.product_id = productId;
      if (type) params.type = type;
      if (referenceType) params.reference_type = referenceType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate + 'T23:59:59';
      const r = await axios.get('/api/inventory/movements', { headers, params });
      setMovements(r.data);
    } catch { setMovements([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    axios.get('/api/products', { headers }).then(r => setProducts(r.data)).catch(() => setProducts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [productId, type, referenceType, startDate, endDate]);

  const totalIn = movements.filter(m => m.type === 'in').reduce((s, m) => s + Number(m.quantity || 0), 0);
  const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + Number(m.quantity || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Riwayat Stok</div>
          <div className="page-subtitle">Kartu stok — pantau setiap barang masuk & keluar (penjualan, pembelian, void, opname, manual)</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-card-header"><div className="stat-card-icon green"><ArrowDownCircle size={20} /></div></div>
          <div className="stat-value">{totalIn}</div>
          <div className="stat-label">Total Barang Masuk (sesuai filter)</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-card-header"><div className="stat-card-icon rose"><ArrowUpCircle size={20} /></div></div>
          <div className="stat-value">{totalOut}</div>
          <div className="stat-label">Total Barang Keluar (sesuai filter)</div>
        </div>
        <div className="stat-card indigo">
          <div className="stat-card-header"><div className="stat-card-icon indigo"><History size={20} /></div></div>
          <div className="stat-value">{movements.length}</div>
          <div className="stat-label">Total Catatan Mutasi</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><History size={17} color="var(--primary)" /> Log Mutasi Stok</div>
          <div className="filter-bar" style={{ margin: 0, flexWrap: 'wrap' }}>
            <select className="form-select" style={{ width: 180 }} value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">Semua Produk</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 130 }} value={type} onChange={e => setType(e.target.value)}>
              <option value="">Semua Tipe</option>
              <option value="in">Masuk</option>
              <option value="out">Keluar</option>
              <option value="set">Set Manual</option>
            </select>
            <select className="form-select" style={{ width: 170 }} value={referenceType} onChange={e => setReferenceType(e.target.value)}>
              <option value="">Semua Referensi</option>
              <option value="sale">Penjualan</option>
              <option value="purchase">Pembelian (PO)</option>
              <option value="void">Void Transaksi</option>
              <option value="opname">Stock Opname</option>
              <option value="manual">Manual</option>
            </select>
            <input type="date" className="form-input" style={{ width: 150 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <input type="date" className="form-input" style={{ width: 150 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Waktu</th><th>Produk</th><th>Tipe</th><th style={{ textAlign: 'center' }}>Jumlah</th>
                  <th>Referensi</th><th>Catatan</th><th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><div className="empty-state-icon">📭</div><h3>Belum ada mutasi stok</h3><p>Catatan barang masuk/keluar akan muncul di sini</p></div>
                  </td></tr>
                ) : movements.map(m => {
                  const t = TYPE_BADGE[m.type] || TYPE_BADGE.set;
                  return (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(m.created_at)}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{m.product_name || '-'}</span>
                        {m.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.sku}</div>}
                      </td>
                      <td><span className={`badge ${t.cls}`}>{t.label}</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.quantity} {m.unit || ''}</td>
                      <td><span className="badge badge-gray">{REF_LABEL[m.reference_type] || m.reference_type || '-'}</span></td>
                      <td style={{ maxWidth: 240, fontSize: 12.5, color: 'var(--text-secondary)' }}>{m.notes || '-'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.created_by || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
