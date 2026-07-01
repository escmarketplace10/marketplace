import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Package, Users, LogOut, Settings } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Kantinku Admin</h2>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/laba-rugi" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <Receipt size={20} /> Laba Rugi
          </NavLink>
          <NavLink to="/menu" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <Package size={20} /> Menu & Stok
          </NavLink>
          <NavLink to="/karyawan" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <Users size={20} /> Karyawan
          </NavLink>
          <NavLink to="/settings" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            <Settings size={20} /> Pengaturan
          </NavLink>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="navbar">
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#EF4444' }}>
            <LogOut size={20} /> Logout
          </button>
        </header>
        
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
