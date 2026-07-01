import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('admin@kantinku.com');
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
      setError(err.response?.data?.error || 'Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">🏪</div>
        </div>
        <h1>ESC Marketplace</h1>
        <p className="login-subtitle">Masuk ke panel administrasi Anda</p>

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
      </div>
    </div>
  );
}
