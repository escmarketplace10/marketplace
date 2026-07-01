import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Package, Truck, ShoppingCart,
  Wallet, Users, LogOut, UserCheck
} from 'lucide-react';

const navItems = [
  {
    section: 'Overview',
    links: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/laba-rugi', icon: TrendingUp, label: 'Laba Rugi' },
    ]
  },
  {
    section: 'Inventaris',
    links: [
      { to: '/stocking', icon: Package, label: 'Stok Barang' },
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

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

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
          <div className="sidebar-brand-icon">🏪</div>
          <div className="sidebar-brand-text">
            <h2>ESC Marketplace</h2>
            <span>Admin Dashboard</span>
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
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </aside>

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
