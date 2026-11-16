import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Plus, Search, Edit2 } from 'lucide-react';
import { toast } from '../ui/feedback';



export default function Consignors() {
  const [consignors, setConsignors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [monthly, setMonthly] = useState<any[]>([]);
  const [monthlyError, setMonthlyError] = useState('');

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/consignors', { headers }); setConsignors(r.data); }
    catch { setConsignors([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let active = true;
    setMonthlyError('');
    axios.get('/api/consignors/monthly', { headers, params: { month } })
      .then(r => { if (active) setMonthly(r.data.rows || []); })
      .catch(() => { if (active) { setMonthly([]); setMonthlyError('Rekap bulanan belum dapat dimuat.'); } });
    return () => { active = false; };
  }, [month]);

  const openAdd = () => { setForm({ name: '', phone: '', notes: '' }); setModal('add'); };
  const openEdit = (c: any) => { setForm({ name: c.name, phone: c.phone || '', notes: c.notes || '' }); setModal(c); };

  const handleSave = async () => {
    if (!form.name) { toast('Nama penitip wajib diisi', 'error'); return; }
    setSubmitting(true);
    try {
      if (modal === 'add') await axios.post('/api/consignors', form, { headers });
      else await axios.put(`/api/consignors/${modal.id}`, form, { headers });
      setModal(null);
      toast(modal === 'add' ? 'Penitip ditambahkan.' : 'Penitip diperbarui.', 'success');
      load();
    } catch (e: any) { toast(e.response?.data?.error || 'Gagal menyimpan', 'error'); }
    finally { setSubmitting(false); }
  };

  const filtered = consignors.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Penitip & Margin</div>
          <div className="page-subtitle">Kelola penitip produk dan pembagian hasil komisi</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Penitip</button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Rekap penjualan titipan</div>
          <input type="month" className="form-input" style={{ width: 180 }} aria-label="Bulan rekap" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Hanya transaksi yang sudah dibayar. Margin toko dihitung dari persen penjualan atau nominal per item sesuai pengaturan saat pesanan dibuat.</p>
          {monthlyError ? <p role="alert">{monthlyError}</p> : <div className="table-container" style={{ boxShadow: 'none' }}>
            <table>
              <thead><tr><th>Penitip</th><th style={{ textAlign: 'right' }}>Item terjual</th><th style={{ textAlign: 'right' }}>Penjualan</th><th style={{ textAlign: 'right' }}>Margin toko</th><th style={{ textAlign: 'right' }}>Bagian penitip</th></tr></thead>
              <tbody>
                {monthly.map(c => <tr key={c.id}>
                  <td>{c.name}</td><td style={{ textAlign: 'right' }}>{Number(c.quantity || 0).toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'right' }}>{Number(c.total_sales || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</td>
                  <td style={{ textAlign: 'right' }}>{Number(c.commission_amount || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</td>
                  <td style={{ textAlign: 'right' }}>{Number(c.payable_amount || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</td>
                </tr>)}
                {monthly.length === 0 && <tr><td colSpan={5}>Belum ada penitip untuk ditampilkan.</td></tr>}
              </tbody>
            </table>
          </div>}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 24 }}>
        <div className="stat-card indigo">
          <div className="stat-card-header"><div className="stat-card-icon indigo"><span style={{ fontSize: 22 }}>👥</span></div></div>
          <div className="stat-value">{consignors.length}</div>
          <div className="stat-label">Total Penitip</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-header"><div className="stat-card-icon green"><span style={{ fontSize: 22 }}>✅</span></div></div>
          <div className="stat-value">{consignors.filter(c => c.is_active).length}</div>
          <div className="stat-label">Penitip Aktif</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Users size={17} color="var(--primary)" /> Daftar Penitip ({consignors.length})</div>
          <div className="search-input-wrapper" style={{ minWidth: 220 }}>
            <Search size={15} />
            <input className="search-input" placeholder="Cari penitip..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr><th>Nama Penitip</th><th>No. HP</th><th>Catatan</th><th>Status</th><th style={{ textAlign: 'center' }}>Aksi</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🤝</div>
                      <h3>Belum ada penitip</h3>
                      <p>Tambah penitip pertama Anda untuk mulai mencatat pembagian hasil</p>
                    </div>
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>{c.phone || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 200 }}>{c.notes || '-'}</td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}><Edit2 size={13} /> Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? '➕ Tambah Penitip' : '✏️ Edit Penitip'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {[
                { key: 'name', label: 'Nama Penitip *', placeholder: 'Ibu Sari / Pak Budi', type: 'text' },
                { key: 'phone', label: 'No. HP / WhatsApp', placeholder: '08123456789', type: 'text' },
                { key: 'notes', label: 'Catatan / Keterangan', placeholder: 'Catatan tambahan tentang penitip...', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    type={type}
                    className="form-input"
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>SuperAdmin mengatur margin persen atau Rp per item pada produk di halaman Kelola Menu.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
                {submitting ? 'Menyimpan...' : '✓ Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
