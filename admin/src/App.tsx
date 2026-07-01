import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LabaRugi from './pages/LabaRugi';
import './App.css';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
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
          <Route path="laba-rugi" element={<LabaRugi />} />
          <Route path="menu" element={<div style={{padding: '20px'}}><h2>Manajemen Menu & Stok</h2><p>Halaman ini sedang dalam pengembangan.</p></div>} />
          <Route path="karyawan" element={<div style={{padding: '20px'}}><h2>Manajemen Karyawan</h2><p>Halaman ini sedang dalam pengembangan.</p></div>} />
          <Route path="settings" element={<div style={{padding: '20px'}}><h2>Pengaturan</h2><p>Halaman ini sedang dalam pengembangan.</p></div>} />
          <Route path="*" element={<div style={{padding: '20px'}}><h1>404 Not Found</h1></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
