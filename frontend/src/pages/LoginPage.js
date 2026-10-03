import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken, setStoredUser } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@asylum.io');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      setToken(token);
      setStoredUser(user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-brand">ASYLUM CASE MANAGER</h1>
        <p className="login-sub">Refugee / Asylum Legal Aid Console</p>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="ai-error" style={{ marginBottom: 12 }}>{error}</div>}

        <button
          type="button"
          onClick={() => { setEmail(process.env.REACT_APP_DEMO_EMAIL || ''); setPassword(process.env.REACT_APP_DEMO_PASSWORD || ''); }}
          disabled={!process.env.REACT_APP_DEMO_EMAIL || !process.env.REACT_APP_DEMO_PASSWORD}
          aria-label="Auto Fill Demo Credentials"
          style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
        >
          Auto Fill Demo Credentials
        </button>
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? <><span className="spinner" />Authenticating...</> : 'Sign In'}
        </button>

        <p className="login-hint">
          Demo: <code>admin@asylum.io</code> / <code>admin123</code>
        </p>
      </form>
    </div>
  );
}
