import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  box: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 40, width: 360 },
  title: { fontSize: 28, marginBottom: 8, letterSpacing: '-0.5px' },
  sub: { color: '#888', fontSize: 13, marginBottom: 28 },
  label: { display: 'block', fontSize: 12, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  input: { width: '100%', background: '#111', border: '1px solid #333', borderRadius: 4, padding: '10px 12px', color: '#e8e4dc', fontSize: 15, marginBottom: 18, outline: 'none' },
  btn: { width: '100%', background: '#e8e4dc', color: '#0f0f0f', border: 'none', borderRadius: 4, padding: '12px', fontSize: 15, cursor: 'pointer', fontWeight: 600 },
  err: { color: '#e05', fontSize: 13, marginBottom: 12 },
  link: { marginTop: 20, textAlign: 'center', fontSize: 13, color: '#666' },
  a: { color: '#e8e4dc', textDecoration: 'none' },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      navigate('/editor');
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.title}>Vi-Notes</div>
        <div style={s.sub}>Sign in to your writing space</div>
        {error && <div style={s.err}>{error}</div>}
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <button style={s.btn} onClick={handleLogin}>Sign In</button>
        <div style={s.link}>No account? <Link to="/register" style={s.a}>Register</Link></div>
      </div>
    </div>
  );
}