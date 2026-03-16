import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Players() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const PAGE_SIZE = 25;

  const loadPlayers = useCallback(async (q: string, s: string, o: string, p: number) => {
    setLoading(true);
    try {
      const result = await api.getPlayers({ q, sort: s, order: o, limit: PAGE_SIZE, offset: p * PAGE_SIZE });
      setPlayers(result.players);
      setTotal(result.total);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => {
    api.getPlayerStatsOverview().then(setOverview).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadPlayers(search, sort, order, page);
    }, search ? 300 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, sort, order, page, loadPlayers]);

  const toggleSort = (col: string) => {
    if (sort === col) { setOrder(order === 'asc' ? 'desc' : 'asc'); }
    else { setSort(col); setOrder('asc'); }
    setPage(0);
  };

  const sortIcon = (col: string) => {
    if (sort !== col) return '';
    return order === 'asc' ? ' ▲' : ' ▼';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {overview && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{overview.totalPlayers}</span>
            <span className="stat-label">Total Players</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{overview.activePlayers}</span>
            <span className="stat-label">Currently Active</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{overview.totalHands?.toLocaleString()}</span>
            <span className="stat-label">Total Hands Dealt</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{overview.avgWinRate}%</span>
            <span className="stat-label">Avg Win Rate</span>
          </div>
        </div>
      )}

      <div className="flex-between mb">
        <div className="page-header">
          <h1>Players</h1>
          <p>Manage and track all registered players</p>
        </div>
      </div>

      {error && <div className="login-error mb">{error} <button className="btn btn-sm btn-secondary" style={{ marginLeft: 8 }} onClick={() => setError('')}>dismiss</button></div>}

      <div className="card mb" style={{ padding: '0.75rem 1.25rem' }}>
        <div className="flex-between">
          <input
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', color: 'var(--text-primary)', width: 300, fontSize: '0.9rem' }}
            placeholder="Search by name, screen name, or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          <span className="muted">{total} player{total !== 1 ? 's' : ''} found</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('screenName')}>Screen Name{sortIcon('screenName')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('firstName')}>Name{sortIcon('firstName')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('email')}>Email{sortIcon('email')}</th>
              <th>Live Status</th>
              <th style={{ textAlign: 'right' }}>Hands</th>
              <th style={{ textAlign: 'right' }}>Wins</th>
              <th style={{ textAlign: 'right' }}>Win %</th>
              <th style={{ textAlign: 'right' }}>Points</th>
              <th>Tournaments</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/players/${p.id}`)}>
                <td><strong style={{ color: 'var(--accent-gold)' }}>{p.screenName}</strong></td>
                <td>{p.firstName} {p.lastName}</td>
                <td><span className="muted">{p.email}</span></td>
                <td>
                  {p.liveStatus ? (
                    <span className="flex gap-sm">
                      <span className={`status-dot ${p.liveStatus.state === 'seated' ? 'status-connected' : 'status-error'}`} />
                      <span style={{ fontSize: '0.85rem' }}>
                        Seat {p.liveStatus.seatNumber} @ {p.liveStatus.tableName}
                      </span>
                    </span>
                  ) : (
                    <span className="badge badge-neutral">Offline</span>
                  )}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.totalHands}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.totalWins}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.winRate}%</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }} className={p.totalPoints >= 0 ? 'profit-positive' : 'profit-negative'}>
                  {p.totalPoints >= 0 ? '+' : ''}{p.totalPoints.toLocaleString()}
                </td>
                <td><span className="badge badge-blue">{p.tournamentsPlayed}</span></td>
              </tr>
            ))}
            {!loading && players.length === 0 && (
              <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                {search ? 'No players match your search.' : 'No players registered yet.'}
              </td></tr>
            )}
            {loading && (
              <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-sm mt" style={{ justifyContent: 'center' }}>
          <button className="btn btn-sm btn-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted" style={{ padding: '0.35rem 0.5rem' }}>Page {page + 1} of {totalPages}</span>
          <button className="btn btn-sm btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
