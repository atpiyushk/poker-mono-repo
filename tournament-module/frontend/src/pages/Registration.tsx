import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';

export default function Registration() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', screenName: '',
  });
  const [screenNameAvailable, setScreenNameAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!form.screenName || form.screenName.length < 2) { setScreenNameAvailable(null); return; }
    setChecking(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await api.checkScreenName(form.screenName);
        setScreenNameAvailable(result.available);
      } catch { setScreenNameAvailable(null); }
      setChecking(false);
    }, 500);
  }, [form.screenName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const player = await api.register({
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, phone: form.phone || undefined, screenName: form.screenName,
      });
      setSuccess(player);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-header">
            <div className="logo-icon">♠</div>
            <h1 style={{ color: 'var(--accent-green)' }}>Registration Successful!</h1>
          </div>
          <p>Welcome, <strong style={{ color: 'var(--accent-gold)' }}>{success.screenName}</strong>!</p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>You can now be onboarded to any tournament table.</p>
          <div className="flex gap mt" style={{ justifyContent: 'center' }}>
            <NavLink to={`/register/badge/${success.id}`}>
              <button className="btn btn-primary">View Badge</button>
            </NavLink>
            <NavLink to="/login">
              <button className="btn btn-secondary">Back to Login</button>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">♠</div>
          <h1>Player Registration</h1>
          <p>Sign up to play in tournaments</p>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required placeholder="John" />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required placeholder="Doe" />
            </div>
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="john@example.com" />
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0123" />
          </div>
          <div className="form-group">
            <label>Screen Name *</label>
            <div style={{ position: 'relative' }}>
              <input
                value={form.screenName}
                onChange={e => setForm({ ...form, screenName: e.target.value })}
                required
                placeholder="PokerKing99"
                style={{ paddingRight: '2.5rem' }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>
                {checking ? '...' : screenNameAvailable === true ? '✓' : screenNameAvailable === false ? '✗' : ''}
              </span>
            </div>
            {screenNameAvailable === false && <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>Screen name is taken</span>}
            {screenNameAvailable === true && <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Available!</span>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || screenNameAvailable === false}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <NavLink to="/login">Back to Login</NavLink>
        </div>
      </div>
    </div>
  );
}
