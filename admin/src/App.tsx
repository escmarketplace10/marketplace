import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import LabaRugi from './pages/LabaRugi';
import Products from './pages/Products';
import Stocking from './pages/Stocking';
import StockLedger from './pages/StockLedger';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import Consignors from './pages/Consignors';
import Employees from './pages/Employees';
import Bantuan from './pages/Bantuan';
import AuditLog from './pages/AuditLog';
import './App.css';
import axios from 'axios';
import { FeedbackHost } from './ui/feedback';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { hasPerm, isSuperAdmin, PERMISSION_OPTIONS, type Perm } from './lib/perms';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Token admin bisa kedaluwarsa (7 hari). Tanpa penanganan, halaman gagal diam-diam
// dan tampak "rusak". Interceptor ini: kalau server balas 401, bersihkan sesi dan
// lempar ke /login supaya user tahu harus login ulang.
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
}

// Halaman pertama yang boleh diakses user (untuk index & fallback redirect).
function firstAllowedPath(): string {
  if (isSuperAdmin()) return '/dashboard';
  const hit = PERMISSION_OPTIONS.find(o => hasPerm(o.key));
  return hit ? `/${hit.key}` : '/bantuan';
}

// Guard per-rute: jika sub-admin tak punya izin, alihkan ke halaman pertama
// yang diizinkan. Penegakan sesungguhnya tetap di backend.
function Guard({ perm, superOnly, children }: { perm?: Perm; superOnly?: boolean; children: React.ReactNode }) {
  const ok = superOnly ? isSuperAdmin() : perm ? hasPerm(perm) : true;
  if (!ok) return <Navigate to={firstAllowedPath()} replace />;
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          <Route index element={<Navigate to={firstAllowedPath()} replace />} />
          <Route path="dashboard" element={<Guard perm="dashboard"><Dashboard /></Guard>} />
          <Route path="transactions" element={<Guard perm="transactions"><Transactions /></Guard>} />
          <Route path="laba-rugi" element={<Guard perm="laba-rugi"><LabaRugi /></Guard>} />
          <Route path="products" element={<Guard perm="products"><Products /></Guard>} />
          <Route path="stocking" element={<Guard perm="stocking"><Stocking /></Guard>} />
          <Route path="stock-ledger" element={<Guard perm="stock-ledger"><StockLedger /></Guard>} />
          <Route path="suppliers" element={<Guard perm="suppliers"><Suppliers /></Guard>} />
          <Route path="purchases" element={<Guard perm="purchases"><Purchases /></Guard>} />
          <Route path="expenses" element={<Guard perm="expenses"><Expenses /></Guard>} />
          <Route path="consignors" element={<Guard perm="consignors"><Consignors /></Guard>} />
          <Route path="employees" element={<Guard superOnly><Employees /></Guard>} />
          <Route path="audit-log" element={<Guard perm="audit-log"><AuditLog /></Guard>} />
          <Route path="bantuan" element={<Bantuan />} />
          <Route path="*" element={<div style={{ padding: '40px', textAlign: 'center' }}><h2>404 — Halaman tidak ditemukan</h2></div>} />
        </Route>
      </Routes>
      <FeedbackHost />
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
