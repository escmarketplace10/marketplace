import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, KeyRound, UserCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast, confirmDialog } from '../ui/feedback';
import { PERMISSION_OPTIONS, type Perm } from '../lib/perms';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', phone: '', role: 'cashier', pin: '', commission_rate: 0, is_active: 1, email: '', password: '', permissions: [] as Perm[] });
  const [submitting, setSubmitting] = useState(false);
  // Modal ringkas khusus reset PIN (tanpa buka form edit lengkap).
  const [pinModal, setPinModal] = useState<any>(null);
  const [newPin, setNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/employees', { headers }); setEmployees(r.data); }
    catch { setEmployees([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', phone: '', role: 'cashier', pin: '', commission_rate: 0, is_active: 1, email: '', password: '', permissions: [] }); setModal('add'); };

  const openEdit = (e: any) => {
    setForm({
      name: e.name,
      phone: e.phone || '',
      role: e.role,
      pin: '', // Kosongkan PIN saat edit agar tidak tertimpa kecuali diisi
      commission_rate: e.commission_rate || 0,
      is_active: e.is_active,
      email: e.email || '',
      password: '', // kosong = tidak mengubah password
      permissions: Array.isArray(e.permissions) ? e.permissions : [],
    });
    setModal(e);
  };

  const togglePerm = (key: Perm) => setForm((f: any) => ({
    ...f,
    permissions: f.permissions.includes(key)
      ? f.permissions.filter((p: string) => p !== key)
      : [...f.permissions, key],
  }));

  const handleSave = async () => {
    if (!form.name) { toast('Nama wajib diisi', 'error'); return; }

    const isAdmin = form.role === 'admin';
    if (isAdmin) {
      if (!form.email) { toast('Email wajib untuk role Admin', 'error'); return; }
      if (modal === 'add' && (!form.password || form.password.length < 8)) {
        toast('Password wajib diisi (min. 8 karakter)', 'error'); return;
      }
      if (form.password && form.password.length < 8) {
        toast('Password minimal 8 karakter', 'error'); return;
      }
    } else {
      if (modal === 'add' && (!form.pin || form.pin.length < 4 || form.pin.length > 6)) {
        toast('PIN Login wajib diisi (4-6 digit angka)', 'error'); return;
      }
      if (form.pin && (form.pin.length < 4 || form.pin.length > 6)) {
        toast('PIN Login harus 4-6 digit angka', 'error'); return;
      }
    }

    // Susun payload sesuai role agar tidak mengirim field yang tidak relevan.
    const payload: any = {
      name: form.name, phone: form.phone, role: form.role,
      commission_rate: form.commission_rate, is_active: form.is_active,
    };
    if (isAdmin) {
      payload.email = form.email;
      if (form.password) payload.password = form.password;
      payload.permissions = form.permissions;
    } else if (form.pin) {
      payload.pin = form.pin;
    }

    setSubmitting(true);
    try {
      if (modal === 'add') await axios.post('/api/employees', payload, { headers });
      else await axios.put(`/api/employees/${modal.id}`, payload, { headers });
      setModal(null);
      toast(modal === 'add' ? 'Akun ditambahkan.' : 'Data diperbarui.', 'success');
      load();
    } catch (e: any) { toast(e.response?.data?.error || 'Gagal menyimpan data', 'error'); }
    finally { setSubmitting(false); }
  };

  const openResetPin = (e: any) => { setNewPin(''); setPinModal(e); };

  const submitPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) { toast('PIN harus 4-6 digit angka', 'error'); return; }
    setPinSaving(true);
    try {
      // Kirim hanya field pin; kolom lain di-COALESCE server jadi tidak berubah.
      await axios.put(`/api/employees/${pinModal.id}`, { pin: newPin }, { headers });
      toast(`PIN ${pinModal.name} berhasil direset.`, 'success');
      setPinModal(null);
    } catch (e: any) { toast(e.response?.data?.error || 'Gagal reset PIN', 'error'); }
    finally { setPinSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Nonaktifkan Karyawan',
      message: 'Nonaktifkan karyawan ini? Akun tidak bisa dipakai login sampai diaktifkan kembali.',
      confirmText: 'Nonaktifkan',
      danger: true,
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/employees/${id}`, { headers });
      toast('Karyawan dinonaktifkan.', 'success');
      load();
    } catch (e: any) { toast(e.response?.data?.error || 'Gagal menonaktifkan', 'error'); }
  };

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Karyawan &amp; Admin</div>
          <div className="page-subtitle">Kasir/petugas stok (PIN aplikasi) &amp; sub-admin (email + hak akses web)</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Akun</button>
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
        <div className="stat-card amber">
          <div className="stat-card-header"><div className="stat-card-icon amber"><span style={{ fontSize: 22 }}>📦</span></div></div>
          <div className="stat-value">{employees.filter(e => e.role === 'stocking').length}</div>
          <div className="stat-label">Petugas Stok</div>
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
                      <span className={`badge ${e.role === 'admin' ? 'badge-green' : e.role === 'stocking' ? 'badge-orange' : 'badge-blue'}`}>
                        {e.role === 'admin' ? '🛡️ Admin' : e.role === 'stocking' ? '📦 Petugas Stok' : '🛒 Kasir'}
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
                        {e.role !== 'admin' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openResetPin(e)} title="Reset PIN"><KeyRound size={13} /></button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(e)} title="Edit"><Edit2 size={13} /></button>
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
              <div className="modal-title">{modal === 'add' ? '➕ Tambah Akun Baru' : '✏️ Edit Akun'}</div>
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
                  onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Peran Karyawan *</label>
                  <select className="form-select" value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
                    <option value="cashier">Kasir (transaksi &amp; pelanggan)</option>
                    <option value="stocking">Petugas Stok (menu, stok, pembelian)</option>
                    <option value="admin">Admin (login web, hak akses diatur)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">No. Telepon / WA</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="0812345678"
                    value={form.phone}
                    onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              {form.role === 'admin' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Email Login *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="admin2@kantinku.com"
                      value={form.email}
                      onChange={e => setForm((f: any) => ({ ...f, email: e.target.value.trim() }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <KeyRound size={15} color="var(--primary)" />
                      Password {modal === 'add' ? '* (min. 8 karakter)' : '(kosongkan jika tidak diubah)'}
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder={modal === 'add' ? 'Minimal 8 karakter' : '••••••••'}
                      value={form.password}
                      onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
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
                    onChange={e => setForm((f: any) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  />
                  {modal !== 'add' && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldAlert size={13} /> Kosongkan jika tidak ingin merubah PIN saat ini.
                    </div>
                  )}
                </div>
              )}

              {form.role === 'admin' && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={15} color="var(--primary)" /> Hak Akses Halaman
                  </label>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Centang halaman yang boleh diakses admin ini. Halaman Karyawan &amp; Admin tetap hanya untuk Super Admin.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {PERMISSION_OPTIONS.map(opt => (
                      <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '6px 8px', border: '1px solid var(--border-light)', borderRadius: 8, background: form.permissions.includes(opt.key) ? 'var(--primary-50, #FFF7ED)' : 'transparent' }}>
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(opt.key)}
                          onChange={() => togglePerm(opt.key)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Komisi Penjualan (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="0"
                  value={form.commission_rate}
                  onChange={e => setForm((f: any) => ({ ...f, commission_rate: Number(e.target.value) }))}
                />
              </div>

              {modal !== 'add' && (
                <div className="form-group" style={{ marginTop: 24, padding: 16, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18 }} 
                      checked={form.is_active === 1}
                      onChange={e => setForm((f: any) => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
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

      {/* Modal ringkas: reset PIN */}
      {pinModal && (
        <div className="modal-overlay" onClick={() => setPinModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <div className="modal-title"><KeyRound size={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Reset PIN</div>
              <button className="modal-close" onClick={() => setPinModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
                PIN baru untuk <strong>{pinModal.name}</strong>. Karyawan langsung pakai PIN ini untuk login.
              </div>
              <div className="form-group">
                <label className="form-label">PIN Baru (4-6 digit)</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  className="form-input"
                  style={{ fontSize: 18, letterSpacing: 8, fontWeight: 700, textAlign: 'center' }}
                  placeholder="••••••"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') submitPin(); }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPinModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={submitPin} disabled={pinSaving}>
                {pinSaving ? 'Menyimpan…' : 'Simpan PIN Baru'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
