import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { errText } from '../ui/feedback';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/login', { email, password });
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(errText(err.response?.data?.error ?? err.response?.data, 'Terjadi kesalahan pada server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <img src="/logo.png" alt="Kantinku" width={64} height={64} style={{ borderRadius: 14, display: 'block' }} />
        </div>
        <h1>Kantinku</h1>
        <p className="login-subtitle">Panel Admin — kelola toko Anda</p>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="login-label">Email</label>
          <input
            id="login-email"
            type="email"
            className="login-input"
            placeholder="admin@kantinku.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <label className="login-label">Password</label>
          <input
            id="login-password"
            type="password"
            className="login-input"
            placeholder="Masukkan password Anda"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button id="login-submit" type="submit" className="login-btn" disabled={loading}>
            {loading ? '⏳ Memverifikasi...' : '🔐 Masuk ke Dashboard'}
          </button>
        </form>

        <div className="login-note">
          Khusus <strong>Admin</strong>. Kasir &amp; Petugas Stok login lewat aplikasi HP.
        </div>
      </div>
    </div>
  );
}
