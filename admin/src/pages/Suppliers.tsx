import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Plus, Truck, Edit2, Trash2 } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/suppliers', { headers }); setSuppliers(r.data); }
    catch { setSuppliers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', contact_person: '', phone: '', email: '', address: '' }); setModal('add'); };
  const openEdit = (s: any) => { setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '' }); setModal(s); };

  const handleSave = async () => {
    if (!form.name) return alert('Nama supplier wajib diisi');
    setSubmitting(true);
    try {
      if (modal === 'add') await axios.post('/api/suppliers', form, { headers });
      else await axios.put(`/api/suppliers/${modal.id}`, form, { headers });
      setModal(null);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus supplier ini?')) return;
    await axios.delete(`/api/suppliers/${id}`, { headers });
    load();
  };

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Supplier</div>
          <div className="page-subtitle">Kelola daftar pemasok dan vendor Anda</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Supplier</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Truck size={17} color="var(--primary)" /> Daftar Supplier ({suppliers.length})</div>
          <div className="search-input-wrapper" style={{ minWidth: 220 }}>
            <Search size={15} />
            <input className="search-input" placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Nama Supplier</th>
                  <th>Kontak PIC</th>
                  <th>No. Telepon</th>
                  <th>Email</th>
                  <th>Alamat</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><div className="empty-state-icon">🚚</div><h3>Belum ada supplier</h3><p>Klik "Tambah Supplier" untuk memulai</p></div>
                  </td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id}>
                    <td><span style={{ fontWeight: 600 }}>{s.name}</span></td>
                    <td>{s.contact_person || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.email || '-'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}><Edit2 size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                      </div>
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
              <div className="modal-title">{modal === 'add' ? '➕ Tambah Supplier' : '✏️ Edit Supplier'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {[
                { key: 'name', label: 'Nama Supplier *', placeholder: 'PT. Sumber Makmur' },
                { key: 'contact_person', label: 'Nama PIC / Kontak', placeholder: 'Budi Santoso' },
                { key: 'phone', label: 'No. Telepon', placeholder: '08123456789' },
                { key: 'email', label: 'Email', placeholder: 'supplier@email.com' },
                { key: 'address', label: 'Alamat', placeholder: 'Jl. Raya No. 1, Jakarta' },
              ].map(({ key, label, placeholder }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
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
