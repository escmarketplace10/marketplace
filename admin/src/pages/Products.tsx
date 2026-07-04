import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Plus, Pencil, Trash2, UtensilsCrossed, FolderOpen, X } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const rupiah = (n: number) => 'Rp ' + fmt(n);

const UNIT_OPTIONS = ['pcs', 'Kg', 'Mg', 'gram', 'liter', 'ml', 'pack', 'lusin', 'box', 'botol', 'kaleng', 'sachet', 'bungkus', 'porsi', 'cup'];
const DECIMAL_UNITS = new Set(['Kg', 'Mg', 'gram', 'liter', 'ml']);
const fmtStock = (n: number, unit?: string) => {
  if (unit && DECIMAL_UNITS.has(unit)) {
    if (n === Math.floor(n)) return fmt(n);
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(n);
  }
  return fmt(Math.floor(n));
};

interface Category { id: string; name: string; icon: string; product_count: number; }

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [consignors, setConsignors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [catModal, setCatModal] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, conRes] = await Promise.all([
        axios.get('/api/products', { headers }),
        axios.get('/api/categories', { headers }),
        axios.get('/api/consignors', { headers }).catch(() => ({ data: [] })),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
      setConsignors(conRes.data);
    } catch { setProducts([]); setCategories([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => {
    if (filterCat && p.category_id !== filterCat) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s);
  });

  const openProductModal = (existing?: any) => {
    setModal({
      id: existing?.id || null,
      name: existing?.name || '',
      category_id: existing?.category_id || (categories[0]?.id || ''),
      price: existing?.price ?? '',
      cost_price: existing?.cost_price ?? '',
      unit: existing?.unit || 'pcs',
      stock: existing?.stock ?? 0,
      min_stock: existing?.min_stock ?? 0,
      is_track_stock: existing?.is_track_stock ?? 1,
      sku: existing?.sku || '',
      barcode: existing?.barcode || '',
      consignor_id: existing?.consignor_id || '',
      commission_percent: existing?.commission_percent ?? '',
    });
  };

  const saveProduct = async () => {
    if (!modal) return;
    if (!modal.name || !modal.category_id || modal.price === '') {
      alert('Nama, kategori, dan harga wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        name: modal.name,
        category_id: modal.category_id,
        price: Number(modal.price),
        cost_price: Number(modal.cost_price) || 0,
        unit: modal.unit,
        stock: Number(modal.stock) || 0,
        min_stock: Number(modal.min_stock) || 0,
        is_track_stock: modal.is_track_stock ? 1 : 0,
        sku: modal.sku || null,
        barcode: modal.barcode || null,
        consignor_id: modal.consignor_id || null,
        commission_percent: modal.consignor_id ? (Number(modal.commission_percent) || 0) : null,
      };
      if (modal.id) {
        await axios.put(`/api/products/${modal.id}`, data, { headers });
      } else {
        await axios.post('/api/products', data, { headers });
      }
      setModal(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Gagal menyimpan produk');
    } finally { setSubmitting(false); }
  };

  const deleteProduct = async (p: any) => {
    if (!confirm(`Hapus "${p.name}"? Produk akan dinonaktifkan.`)) return;
    try {
      await axios.delete(`/api/products/${p.id}`, { headers });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Gagal menghapus');
    }
  };

  // Category CRUD
  const openCatModal = (existing?: Category) => {
    setCatModal({
      id: existing?.id || null,
      name: existing?.name || '',
      icon: existing?.icon || '📦',
    });
  };

  const saveCategory = async () => {
    if (!catModal?.name) { alert('Nama kategori wajib diisi.'); return; }
    setSubmitting(true);
    try {
      if (catModal.id) {
        await axios.put(`/api/categories/${catModal.id}`, { name: catModal.name, icon: catModal.icon }, { headers });
      } else {
        await axios.post('/api/categories', { name: catModal.name, icon: catModal.icon }, { headers });
      }
      setCatModal(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Gagal menyimpan kategori');
    } finally { setSubmitting(false); }
  };

  const deleteCategory = async (c: Category) => {
    if (c.product_count > 0) { alert('Tidak bisa hapus kategori yang masih punya produk. Pindahkan produknya dulu.'); return; }
    if (!confirm(`Hapus kategori "${c.name}"?`)) return;
    try {
      await axios.delete(`/api/categories/${c.id}`, { headers });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Gagal menghapus kategori');
    }
  };

  const activeProducts = products.filter(p => p.is_active !== 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Kelola Menu</div>
          <div className="page-subtitle">Tambah, ubah, dan hapus produk & kategori</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => openCatModal()}>
            <FolderOpen size={14} /> Kategori Baru
          </button>
          <button className="btn btn-primary" onClick={() => openProductModal()}>
            <Plus size={14} /> Produk Baru
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Produk', val: activeProducts.length, icon: '🍽️', color: 'indigo' },
          { label: 'Kategori', val: categories.length, icon: '📁', color: 'blue' },
          { label: 'Barang Titipan', val: activeProducts.filter(p => p.consignor_id).length, icon: '🤝', color: 'green' },
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

      {/* Categories row */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title"><FolderOpen size={17} color="var(--primary)" /> Kategori</div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 10,
              background: filterCat === c.id ? 'var(--primary-100)' : '#F5F3EF',
              border: filterCat === c.id ? '1.5px solid var(--primary)' : '1.5px solid transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s',
            }} onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}>
              <span>{c.icon}</span>
              <span>{c.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({c.product_count})</span>
              <button onClick={e => { e.stopPropagation(); openCatModal(c); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}>
                <Pencil size={12} />
              </button>
              <button onClick={e => { e.stopPropagation(); deleteCategory(c); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--danger)' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {categories.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada kategori. Buat dulu sebelum menambah produk.</span>}
        </div>
      </div>

      {/* Products table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><UtensilsCrossed size={17} color="var(--primary)" /> Daftar Produk</div>
          <div className="filter-bar" style={{ margin: 0, gap: 10 }}>
            <div className="search-input-wrapper" style={{ minWidth: 220 }}>
              <Search size={15} />
              <input className="search-input" placeholder="Cari produk / SKU..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🍽️</div>
            <h3>Belum ada produk</h3>
            <p>Klik "Produk Baru" untuk menambahkan menu pertama.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: 'right' }}>Harga Jual</th>
                  <th style={{ textAlign: 'right' }}>Harga Modal</th>
                  <th style={{ textAlign: 'center' }}>Stok</th>
                  <th>Satuan</th>
                  <th>Titipan</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ opacity: p.is_active === 0 ? 0.45 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.image ? (
                          <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽️</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-gray">{p.category_icon || '📦'} {p.category_name || '-'}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{rupiah(p.price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.cost_price ? rupiah(p.cost_price) : '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {p.is_track_stock ? (
                        <span style={{ fontWeight: 700, color: p.stock <= 0 ? 'var(--danger)' : p.stock <= (p.min_stock || 0) ? 'var(--warning)' : 'var(--text-primary)' }}>
                          {fmtStock(p.stock, p.unit)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>∞</span>
                      )}
                    </td>
                    <td><span className="badge badge-gray">{p.unit || 'pcs'}</span></td>
                    <td>
                      {p.consignor_id ? (
                        <span className="badge badge-orange">{p.consignor_name} ({p.commission_percent}%)</span>
                      ) : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openProductModal(p)}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal.id ? '✏️ Edit Produk' : '➕ Produk Baru'}</div>
              <button className="modal-close" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Produk *</label>
                <input className="form-input" value={modal.name} onChange={e => setModal((m: any) => ({ ...m, name: e.target.value }))} placeholder="Contoh: Nasi Goreng Spesial" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Kategori *</label>
                  <select className="form-select" value={modal.category_id} onChange={e => setModal((m: any) => ({ ...m, category_id: e.target.value }))}>
                    <option value="">-- Pilih --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Satuan</label>
                  <select className="form-select" value={modal.unit} onChange={e => setModal((m: any) => ({ ...m, unit: e.target.value }))}>
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Harga Jual *</label>
                  <input type="number" className="form-input" min={0} value={modal.price} onChange={e => setModal((m: any) => ({ ...m, price: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga Modal</label>
                  <input type="number" className="form-input" min={0} value={modal.cost_price} onChange={e => setModal((m: any) => ({ ...m, cost_price: e.target.value }))} placeholder="0" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input className="form-input" value={modal.sku} onChange={e => setModal((m: any) => ({ ...m, sku: e.target.value }))} placeholder="Opsional" />
                </div>
                <div className="form-group">
                  <label className="form-label">Barcode</label>
                  <input className="form-input" value={modal.barcode} onChange={e => setModal((m: any) => ({ ...m, barcode: e.target.value }))} placeholder="Opsional" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border-light)', marginTop: 4 }}>
                <input type="checkbox" id="trackStock" checked={!!modal.is_track_stock} onChange={e => setModal((m: any) => ({ ...m, is_track_stock: e.target.checked ? 1 : 0 }))} />
                <label htmlFor="trackStock" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Lacak Stok</label>
              </div>

              {modal.is_track_stock ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Stok Awal</label>
                    <input type="number" className="form-input" min={0} step={DECIMAL_UNITS.has(modal.unit) ? '0.01' : '1'} value={modal.stock} onChange={e => setModal((m: any) => ({ ...m, stock: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stok Minimum</label>
                    <input type="number" className="form-input" min={0} step={DECIMAL_UNITS.has(modal.unit) ? '0.01' : '1'} value={modal.min_stock} onChange={e => setModal((m: any) => ({ ...m, min_stock: e.target.value }))} />
                  </div>
                </div>
              ) : null}

              <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 8, paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <input type="checkbox" id="isConsign" checked={!!modal.consignor_id} onChange={e => setModal((m: any) => ({ ...m, consignor_id: e.target.checked ? (consignors[0]?.id || '') : '' }))} />
                  <label htmlFor="isConsign" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Barang Titipan (Konsinyasi)</label>
                </div>
                {modal.consignor_id && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Penitip</label>
                      <select className="form-select" value={modal.consignor_id} onChange={e => setModal((m: any) => ({ ...m, consignor_id: e.target.value }))}>
                        <option value="">-- Pilih --</option>
                        {consignors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Komisi (%)</label>
                      <input type="number" className="form-input" min={0} max={100} value={modal.commission_percent} onChange={e => setModal((m: any) => ({ ...m, commission_percent: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={saveProduct} disabled={submitting}>
                {submitting ? 'Menyimpan...' : '✓ Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModal && (
        <div className="modal-overlay" onClick={() => setCatModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{catModal.id ? '✏️ Edit Kategori' : '📁 Kategori Baru'}</div>
              <button className="modal-close" onClick={() => setCatModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Kategori *</label>
                <input className="form-input" value={catModal.name} onChange={e => setCatModal((m: any) => ({ ...m, name: e.target.value }))} placeholder="Contoh: Makanan" />
              </div>
              <div className="form-group">
                <label className="form-label">Ikon (emoji)</label>
                <input className="form-input" style={{ width: 80, fontSize: 20, textAlign: 'center' }} value={catModal.icon} onChange={e => setCatModal((m: any) => ({ ...m, icon: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCatModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={saveCategory} disabled={submitting}>
                {submitting ? 'Menyimpan...' : '✓ Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
