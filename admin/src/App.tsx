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
import './App.css';
import axios from 'axios';
import { FeedbackHost } from './ui/feedback';
import { ErrorBoundary } from './ui/ErrorBoundary';

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
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="laba-rugi" element={<LabaRugi />} />
          <Route path="products" element={<Products />} />
          <Route path="stocking" element={<Stocking />} />
          <Route path="stock-ledger" element={<StockLedger />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="consignors" element={<Consignors />} />
          <Route path="employees" element={<Employees />} />
          <Route path="*" element={<div style={{ padding: '40px', textAlign: 'center' }}><h2>404 — Halaman tidak ditemukan</h2></div>} />
        </Route>
      </Routes>
      <FeedbackHost />
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
