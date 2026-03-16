import { Routes, Route, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AdminDashboard from './pages/AdminDashboard';
import ProjectorView from './pages/ProjectorView';
import DealerConsole from './pages/DealerConsole';
import Registration from './pages/Registration';
import BadgeView from './pages/BadgeView';
import Players from './pages/Players';
import PlayerProfile from './pages/PlayerProfile';
import { api } from './api/client';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'dealer'>('admin');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.login(username, password, role);
      localStorage.setItem('tm_token', result.token);
      localStorage.setItem('tm_role', result.role);
      localStorage.setItem('tm_user', username);
      navigate(result.role === 'dealer' ? '/dealer' : '/admin');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">♠</div>
          <h1>Tournament Module</h1>
          <p>Sign in to manage tournaments</p>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="admin">Super Admin</option>
              <option value="dealer">Dealer</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Login</button>
        </form>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <NavLink to="/register">Player Registration</NavLink>
        </div>
      </div>
    </div>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const user = localStorage.getItem('tm_user') || 'admin';

  const logout = () => {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_role');
    localStorage.removeItem('tm_user');
    navigate('/login');
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <span className="logo-icon">♠</span>
          <span>Tournament Module</span>
        </div>
        <ul className="nav-links">
          <li><NavLink to="/admin" end>Dashboard</NavLink></li>
          <li><NavLink to="/admin/players">Players</NavLink></li>
          <li><NavLink to="/admin/projector">Projector View</NavLink></li>
          <li><NavLink to="/dealer">Dealer Console</NavLink></li>
          <li><NavLink to="/register">Registration</NavLink></li>
        </ul>
        <div className="sidebar-footer">
          <span className="user-info">{user}</span>
          <button className="btn btn-sm btn-secondary" onClick={logout}>Logout</button>
        </div>
      </nav>
      <main className="main"><Outlet /></main>
    </div>
  );
}

function DealerLayout() {
  const navigate = useNavigate();
  const user = localStorage.getItem('tm_user') || 'dealer';

  const logout = () => {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_role');
    localStorage.removeItem('tm_user');
    navigate('/login');
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <span className="logo-icon">♠</span>
          <span>Dealer Console</span>
        </div>
        <ul className="nav-links">
          <li><NavLink to="/dealer" end>Console</NavLink></li>
          <li><NavLink to="/admin">Admin View</NavLink></li>
          <li><NavLink to="/register">Registration</NavLink></li>
        </ul>
        <div className="sidebar-footer">
          <span className="user-info">{user}</span>
          <button className="btn btn-sm btn-secondary" onClick={logout}>Logout</button>
        </div>
      </nav>
      <main className="main"><Outlet /></main>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const token = localStorage.getItem('tm_token');
  const role = localStorage.getItem('tm_role');
  if (!token) return <Navigate to="/login" />;
  if (!allowedRoles.includes(role || '')) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Registration />} />
      <Route path="/register/badge/:id" element={<BadgeView />} />
      <Route path="/projector/:tournamentId" element={<ProjectorView />} />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="players" element={<Players />} />
        <Route path="players/:id" element={<PlayerProfile />} />
        <Route path="projector" element={<ProjectorView />} />
      </Route>
      <Route path="/dealer" element={
        <ProtectedRoute allowedRoles={['dealer', 'admin']}>
          <DealerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DealerConsole />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}
