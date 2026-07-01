import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, KeyRound, UserCheck, ShieldAlert } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', role: 'cashier', pin: '', commission_rate: 0, is_active: 1 });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/employees', { headers }); setEmployees(r.data); }
    catch { setEmployees([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', phone: '', role: 'cashier', pin: '', commission_rate: 0, is_active: 1 }); setModal('add'); };
  
  const openEdit = (e: any) => { 
    setForm({ 
      name: e.name, 
      phone: e.phone || '', 
      role: e.role, 
      pin: '', // Kosongkan PIN saat edit agar tidak tertimpa kecuali diisi
      commission_rate: e.commission_rate || 0, 
      is_active: e.is_active 
    }); 
    setModal(e); 
  };

  const handleSave = async () => {
    if (!form.name) return alert('Nama karyawan wajib diisi');
    if (modal === 'add' && (!form.pin || form.pin.length < 4 || form.pin.length > 6)) {
      return alert('PIN Login wajib diisi (4-6 digit angka)');
    }
    if (form.pin && (form.pin.length < 4 || form.pin.length > 6)) {
      return alert('PIN Login harus 4-6 digit angka');
    }

    setSubmitting(true);
    try {
      if (modal === 'add') await axios.post('/api/employees', form, { headers });
      else await axios.put(`/api/employees/${modal.id}`, form, { headers });
      setModal(null);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Gagal menyimpan data karyawan'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan karyawan ini?')) return;
    await axios.delete(`/api/employees/${id}`, { headers });
    load();
  };

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Manajemen Karyawan</div>
          <div className="page-subtitle">Atur akun kasir, supervisor, beserta PIN login mereka</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Karyawan</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="stat-card indigo">
          <div className="stat-card-header"><div className="stat-card-icon indigo"><span style={{ fontSize: 22 }}>👥</span></div></div>
          <div className="stat-value">{employees.length}</div>
          <div className="stat-label">Total Karyawan</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-header"><div className="stat-card-icon green"><span style={{ fontSize: 22 }}>✅</span></div></div>
          <div className="stat-value">{employees.filter(e => e.is_active).length}</div>
          <div className="stat-label">Karyawan Aktif</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-card-header"><div className="stat-card-icon rose"><span style={{ fontSize: 22 }}>🔒</span></div></div>
          <div className="stat-value">{employees.filter(e => e.role === 'supervisor' || e.role === 'admin').length}</div>
          <div className="stat-label">Total Supervisor</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><UserCheck size={17} color="var(--primary)" /> Daftar Karyawan</div>
          <div className="search-input-wrapper" style={{ minWidth: 220 }}>
            <Search size={15} />
            <input className="search-input" placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Nama Karyawan</th>
                  <th>Peran</th>
                  <th>No. HP</th>
                  <th>Komisi (%)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><div className="empty-state-icon">👤</div><h3>Belum ada karyawan</h3><p>Klik Tambah Karyawan untuk mendaftarkan kasir Anda</p></div>
                  </td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {e.name[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{e.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${e.role === 'supervisor' ? 'badge-purple' : 'badge-blue'}`}>
                        {e.role === 'supervisor' ? '👑 Supervisor' : '🛒 Kasir'}
                      </span>
                    </td>
                    <td>{e.phone || '-'}</td>
                    <td>{e.commission_rate || 0}%</td>
                    <td>
                      <span className={`badge ${e.is_active ? 'badge-green' : 'badge-red'}`}>
                        {e.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(e)}><Edit2 size={13} /></button>
                        {e.is_active ? (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)} title="Nonaktifkan Karyawan"><Trash2 size={13} /></button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? '➕ Tambah Karyawan Baru' : '✏️ Edit Data Karyawan'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              
              <div className="form-group">
                <label className="form-label">Nama Lengkap *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Budi Santoso"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Peran Karyawan *</label>
                  <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="cashier">Kasir</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">No. Telepon / WA</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="0812345678"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={15} color="var(--primary)" /> 
                  PIN Login Aplikasi (4-6 Digit) {modal === 'add' ? '*' : '(Opsional)'}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  className="form-input"
                  style={{ fontSize: 18, letterSpacing: 8, fontWeight: 700 }}
                  placeholder="••••••"
                  value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                />
                {modal !== 'add' && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldAlert size={13} /> Kosongkan jika tidak ingin merubah PIN saat ini.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Komisi Penjualan (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="0"
                  value={form.commission_rate}
                  onChange={e => setForm(f => ({ ...f, commission_rate: Number(e.target.value) }))}
                />
              </div>

              {modal !== 'add' && (
                <div className="form-group" style={{ marginTop: 24, padding: 16, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18 }} 
                      checked={form.is_active === 1}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
                    />
                    Akun Karyawan Aktif
                  </label>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginLeft: 28 }}>
                    Hapus centang untuk menonaktifkan akun karyawan agar tidak bisa login lagi.
                  </div>
                </div>
              )}
              
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
                {submitting ? 'Menyimpan...' : '✓ Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
