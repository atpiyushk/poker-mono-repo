import { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { api } from '../api/client';

export default function BadgeView() {
  const { id } = useParams();
  const [player, setPlayer] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getBadge(Number(id)).then(setPlayer).catch(e => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-error">{error}</div>
          <div className="mt">
            <NavLink to="/register">Back to Registration</NavLink>
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ fontSize: '2rem' }}>♠</div>
          <p className="muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div style={{ maxWidth: 500, width: '100%' }}>
        <div className="no-print mb" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.print()}>Print Badge</button>
          <NavLink to="/register"><button className="btn btn-secondary">Back</button></NavLink>
        </div>
        <div className="badge-print">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Tournament Player
          </div>
          <div className="player-name">{player.firstName} {player.lastName}</div>
          <div className="screen-name">{player.screenName}</div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Player #{player.id}
          </div>
        </div>
      </div>
    </div>
  );
}
