import { useEffect, useState } from 'react';
import axios from 'axios';
import { ScrollText, Search, RefreshCw } from 'lucide-react';

// Peta aksi -> label & warna badge (memakai kelas badge yang sudah ada di App.css).
const ACTION_META: Record<string, { label: string; cls: string }> = {
  create: { label: 'Tambah', cls: 'badge-green' },
  update: { label: 'Ubah', cls: 'badge-yellow' },
  delete: { label: 'Hapus', cls: 'badge-red' },
  void: { label: 'Void', cls: 'badge-red' },
  receive: { label: 'Terima', cls: 'badge-green' },
  settle: { label: 'Setoran', cls: 'badge-gray' },
  login: { label: 'Login', cls: 'badge-gray' },
  password_change: { label: 'Ganti Password', cls: 'badge-yellow' },
};

const ENTITY_LABEL: Record<string, string> = {
  product: 'Produk',
  category: 'Kategori',
  supplier: 'Supplier',
  consignor: 'Penitip',
  employee: 'Karyawan',
  expense: 'Biaya',
  purchase_order: 'Pembelian',
  transaction: 'Transaksi',
  admin: 'Admin',
};

function fmtTime(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (entity) params.entity = entity;
      if (action) params.action = action;
      if (search.trim()) params.search = search.trim();
      const r = await axios.get('/api/admin/audit-logs', { headers, params });
      setLogs(Array.isArray(r.data) ? r.data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Muat ulang saat filter dropdown berubah; pencarian teks pakai tombol/Enter.
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entity, action]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Log Aktivitas (Audit)</div>
          <div className="page-subtitle">Catatan siapa mengubah apa &amp; kapan di Panel Admin</div>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Muat Ulang</button>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title"><ScrollText size={17} color="var(--primary)" /> Riwayat ({logs.length})</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="form-select" style={{ minWidth: 130 }} value={entity} onChange={e => setEntity(e.target.value)}>
              <option value="">Semua Data</option>
              {Object.entries(ENTITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="form-select" style={{ minWidth: 120 }} value={action} onChange={e => setAction(e.target.value)}>
              <option value="">Semua Aksi</option>
              {Object.entries(ACTION_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
            </select>
            <div className="search-input-wrapper" style={{ minWidth: 200 }}>
              <Search size={15} />
              <input
                className="search-input"
                placeholder="Cari ringkasan / pelaku…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') load(); }}
              />
            </div>
          </div>
        </div>

        <div className="card-body" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat…</div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>Belum ada aktivitas tercatat</h3>
              <p>Setiap perubahan data (tambah/ubah/hapus) akan muncul di sini.</p>
            </div>
          ) : (
            <table className="table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Waktu</th>
                  <th>Aksi</th>
                  <th>Data</th>
                  <th>Keterangan</th>
                  <th>Pelaku</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const am = ACTION_META[l.action] || { label: l.action, cls: 'badge-gray' };
                  return (
                    <tr key={l.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12.5 }}>{fmtTime(l.created_at)}</td>
                      <td><span className={`badge ${am.cls}`}>{am.label}</span></td>
                      <td style={{ fontSize: 13 }}>{ENTITY_LABEL[l.entity] || l.entity}</td>
                      <td style={{ fontSize: 13 }}>{l.summary || '-'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{l.actor_label || 'Sistem'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
