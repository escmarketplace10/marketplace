import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/login', { email, password });
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login gagal');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login Admin Web</h2>
        {error && <div style={{ color: '#EF4444', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            placeholder="Email (admin@kantinku.com)" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password (password123)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary">Login Masuk</button>
        </form>
      </div>
    </div>
  );
}
