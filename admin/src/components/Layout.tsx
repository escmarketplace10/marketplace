import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard, TrendingUp, Package, Truck, ShoppingCart,
  Wallet, Users, LogOut, UserCheck, KeyRound, X, Receipt, History, UtensilsCrossed
} from 'lucide-react';

const navItems = [
  {
    section: 'Overview',
    links: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/transactions', icon: Receipt, label: 'Transaksi' },
      { to: '/laba-rugi', icon: TrendingUp, label: 'Laba Rugi' },
    ]
  },
  {
    section: 'Inventaris',
    links: [
      { to: '/products', icon: UtensilsCrossed, label: 'Kelola Menu' },
      { to: '/stocking', icon: Package, label: 'Stok Barang' },
      { to: '/stock-ledger', icon: History, label: 'Riwayat Stok' },
      { to: '/suppliers', icon: Truck, label: 'Supplier' },
      { to: '/purchases', icon: ShoppingCart, label: 'Pembelian' },
    ]
  },
  {
    section: 'Keuangan',
    links: [
      { to: '/expenses', icon: Wallet, label: 'Biaya Operasional' },
      { to: '/consignors', icon: Users, label: 'Penitip / Margin' },
    ]
  },
  {
    section: 'Sistem',
    links: [
      { to: '/employees', icon: UserCheck, label: 'Karyawan (Kasir)' },
    ]
  },
];

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setError('');
    if (newPwd.length < 8) return setError('Password baru minimal 8 karakter.');
    if (newPwd !== confirmPwd) return setError('Konfirmasi password tidak sama.');
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      await axios.post('/api/admin/change-password',
        { old_password: oldPwd, new_password: newPwd },
        { headers: { Authorization: `Bearer ${token}` } });
      alert('Password berhasil diganti. Silakan login ulang.');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      navigate('/login');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Gagal mengganti password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Ganti Password Admin</div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Password lama</label>
            <input type="password" className="form-input" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password baru (min. 8 karakter)</label>
            <input type="password" className="form-input" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ulangi password baru</label>
            <input type="password" className="form-input" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showChangePwd, setShowChangePwd] = useState(false);

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch { return {}; }
  })();

  const currentPage = navItems.flatMap(s => s.links).find(l => location.pathname === l.to || location.pathname.startsWith(l.to + '/'));

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">☕</div>
          <div className="sidebar-brand-text">
            <h2>Kantinku</h2>
            <span>Panel Admin</span>
          </div>
        </div>

        {navItems.map(section => (
          <div className="sidebar-section" key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            <nav className="sidebar-nav">
              {section.links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(adminUser.name || 'A')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <h4>{adminUser.name || 'Admin'}</h4>
              <p>{adminUser.email || 'admin@kantinku.com'}</p>
            </div>
          </div>
          <button className="sidebar-logout" onClick={() => setShowChangePwd(true)}>
            <KeyRound size={15} />
            Ganti Password
          </button>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </aside>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}

      {/* MAIN */}
      <main className="main-content">
        <header className="navbar">
          <div className="navbar-left">
            <div className="navbar-title">
              {currentPage?.label || 'Dashboard'}
            </div>
            <div className="navbar-subtitle">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="navbar-right">
            <div className="navbar-badge">
              <div className="live-dot" />
              Sistem Online
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
