import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Wallet, Search, Trash2 } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const categories = ['Listrik', 'Air', 'Internet', 'Gaji', 'Sewa', 'Bahan Bakar', 'Perlengkapan', 'Marketing', 'Lain-lain'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: '', description: '', amount: '', payment_method: 'cash' });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/expenses', { headers }); setExpenses(r.data); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.category || !form.amount) return alert('Kategori dan jumlah wajib diisi');
    setSubmitting(true);
    try {
      await axios.post('/api/expenses', { ...form, amount: Number(form.amount) }, { headers });
      setModal(false);
      setForm({ category: '', description: '', amount: '', payment_method: 'cash' });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus catatan biaya ini?')) return;
    await axios.delete(`/api/expenses/${id}`, { headers });
    load();
  };

  const filtered = expenses.filter(e =>
    e.category?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Biaya Operasional</div>
          <div className="page-subtitle">Catat semua pengeluaran dan biaya operasional toko</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Tambah Biaya</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="stat-card indigo">
          <div className="stat-card-header"><div className="stat-card-icon indigo"><span style={{ fontSize: 22 }}>📊</span></div></div>
          <div className="stat-value">{expenses.length}</div>
          <div className="stat-label">Total Catatan Biaya</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-card-header"><div className="stat-card-icon rose"><span style={{ fontSize: 22 }}>💸</span></div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalExpenses)}</div>
          <div className="stat-label">Total Pengeluaran</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-header"><div className="stat-card-icon amber"><span style={{ fontSize: 22 }}>📁</span></div></div>
          <div className="stat-value">{[...new Set(expenses.map(e => e.category))].length}</div>
          <div className="stat-label">Kategori Unik</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Wallet size={17} color="var(--primary)" /> Daftar Biaya</div>
          <div className="search-input-wrapper" style={{ minWidth: 220 }}>
            <Search size={15} />
            <input className="search-input" placeholder="Cari biaya..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Metode</th><th style={{ textAlign: 'right' }}>Jumlah</th><th style={{ textAlign: 'center' }}>Aksi</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">💰</div><h3>Belum ada catatan biaya</h3><p>Mulai catat pengeluaran operasional Anda</p></div></td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td><span className="badge badge-blue">{e.category}</span></td>
                    <td>{e.description || '-'}</td>
                    <td><span className={`badge ${e.payment_method === 'cash' ? 'badge-green' : 'badge-blue'}`}>{e.payment_method === 'cash' ? '💵 Tunai' : e.payment_method}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{fmt(e.amount)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}><Trash2 size={13} /></button>
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">💸 Tambah Biaya Operasional</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Kategori *</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <input className="form-input" placeholder="Keterangan biaya..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Jumlah (Rp) *</label>
                <input type="number" className="form-input" placeholder="0" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Metode Pembayaran</label>
                <select className="form-select" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">💵 Tunai</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                  <option value="qris">📱 QRIS</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Menyimpan...' : '✓ Simpan Biaya'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
