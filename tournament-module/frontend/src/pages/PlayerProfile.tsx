import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

type Tab = 'overview' | 'hands' | 'tournaments' | 'wallet' | 'edit';

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const playerId = Number(id);
  const [tab, setTab] = useState<Tab>('overview');
  const [player, setPlayer] = useState<any>(null);
  const [hands, setHands] = useState<any[]>([]);
  const [handsTotal, setHandsTotal] = useState(0);
  const [handsPage, setHandsPage] = useState(0);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit form
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', screenName: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const loadPlayer = useCallback(async () => {
    try {
      const p = await api.getPlayer(playerId);
      setPlayer(p);
      setEditForm({
        firstName: p.firstName, lastName: p.lastName,
        email: p.email, phone: p.phone || '', screenName: p.screenName,
      });
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [playerId]);

  const loadHands = useCallback(async () => {
    try {
      const result = await api.getPlayerHands(playerId, { limit: 25, offset: handsPage * 25 });
      setHands(result.hands);
      setHandsTotal(result.total);
    } catch { /* ignore */ }
  }, [playerId, handsPage]);

  const loadWallet = useCallback(async () => {
    try { setWallets(await api.getPlayerWallet(playerId)); } catch { /* ignore */ }
  }, [playerId]);

  useEffect(() => { loadPlayer(); }, [loadPlayer]);
  useEffect(() => { if (tab === 'hands') loadHands(); }, [tab, loadHands]);
  useEffect(() => { if (tab === 'wallet') loadWallet(); }, [tab, loadWallet]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true); setError(''); setEditSuccess(false);
    try {
      await api.updatePlayer(playerId, editForm);
      setEditSuccess(true);
      await loadPlayer();
    } catch (err: any) { setError(err.message); }
    setEditLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this player? This cannot be undone.')) return;
    try {
      await api.deletePlayer(playerId, true);
      navigate('/admin/players');
    } catch (err: any) { setError(err.message); }
  };

  if (loading) return <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Loading player...</div>;
  if (!player) return <div className="login-error" style={{ margin: '2rem' }}>{error || 'Player not found'}</div>;

  const { stats, liveStatus, tournamentStats } = player;
  const handsPages = Math.ceil(handsTotal / 25);

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb">
        <div>
          <div className="flex gap-sm" style={{ alignItems: 'baseline' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/players')}>&larr; Back</button>
            <h1 style={{ margin: 0 }}>{player.screenName}</h1>
            {liveStatus && (
              <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>
                <span className="status-dot status-connected" style={{ marginRight: 4 }} />
                Live — Seat {liveStatus.seatNumber} @ {liveStatus.tableName}
              </span>
            )}
            {!liveStatus && <span className="badge badge-neutral" style={{ marginLeft: '0.5rem' }}>Offline</span>}
          </div>
          <p className="muted" style={{ marginTop: '0.25rem' }}>{player.firstName} {player.lastName} &middot; {player.email}{player.phone ? ` · ${player.phone}` : ''}</p>
        </div>
      </div>

      {error && <div className="login-error mb">{error} <button className="btn btn-sm btn-secondary" style={{ marginLeft: 8 }} onClick={() => setError('')}>dismiss</button></div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value" style={{ color: stats.totalPoints >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {stats.totalPoints >= 0 ? '+' : ''}{stats.totalPoints.toLocaleString()}
          </span>
          <span className="stat-label">Total Points</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalHands.toLocaleString()}</span>
          <span className="stat-label">Hands Played</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.totalWins}</span>
          <span className="stat-label">Hands Won</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.winRate}%</span>
          <span className="stat-label">Win Rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {stats.biggestWin ? `+${stats.biggestWin.netChips.toLocaleString()}` : '—'}
          </span>
          <span className="stat-label">Biggest Win</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--accent-red)' }}>
            {stats.biggestLoss ? stats.biggestLoss.netChips.toLocaleString() : '—'}
          </span>
          <span className="stat-label">Biggest Loss</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">${stats.totalBalance.toLocaleString()}</span>
          <span className="stat-label">Wallet Balance</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: stats.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toLocaleString()}
          </span>
          <span className="stat-label">Net Profit</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['overview', 'hands', 'tournaments', 'wallet', 'edit'] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'hands' ? `Hand History (${stats.totalHands})` : t === 'tournaments' ? `Tournaments (${tournamentStats?.length || 0})` : t === 'wallet' ? 'Wallet' : 'Edit Player'}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          {liveStatus && (
            <div className="card mb">
              <h3>Live Status</h3>
              <div className="grid-4">
                <div>
                  <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>State</span>
                  <span className={`badge ${liveStatus.state === 'seated' ? 'badge-success' : 'badge-warning'}`}>{liveStatus.state}</span>
                </div>
                <div>
                  <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Seat</span>
                  <strong>#{liveStatus.seatNumber}</strong>
                </div>
                <div>
                  <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Table</span>
                  <strong>{liveStatus.tableName}</strong>
                </div>
                <div>
                  <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Tournament</span>
                  <strong>{liveStatus.tournamentName}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="card mb">
            <h3>Player Details</h3>
            <div className="grid-3">
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Full Name</span>
                <strong>{player.firstName} {player.lastName}</strong>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Screen Name</span>
                <strong style={{ color: 'var(--accent-gold)' }}>{player.screenName}</strong>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Email</span>
                <span>{player.email}</span>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Phone</span>
                <span>{player.phone || '—'}</span>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Registered</span>
                <span>{new Date(player.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Player ID</span>
                <code style={{ color: 'var(--text-secondary)' }}>#{player.id}</code>
              </div>
            </div>
          </div>

          {tournamentStats && tournamentStats.length > 0 && (
            <div className="card">
              <h3>Tournament Performance</h3>
              <table>
                <thead>
                  <tr>
                    <th>Tournament</th><th>Status</th><th>Rank</th>
                    <th style={{ textAlign: 'right' }}>Points</th>
                    <th style={{ textAlign: 'right' }}>Hands</th>
                    <th style={{ textAlign: 'right' }}>Wins</th>
                    <th style={{ textAlign: 'right' }}>Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStats.map((ts: any) => (
                    <tr key={ts.tournament.id}>
                      <td><strong>{ts.tournament.name}</strong></td>
                      <td><span className={`badge ${ts.tournament.status === 'active' ? 'badge-success' : ts.tournament.status === 'completed' ? 'badge-neutral' : 'badge-warning'}`}>{ts.tournament.status}</span></td>
                      <td>{ts.rank ? <strong>#{ts.rank}</strong> : <span className="muted">—</span>}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }} className={ts.totalPoints >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {ts.totalPoints >= 0 ? '+' : ''}{ts.totalPoints.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{ts.handsPlayed}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{ts.wins}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {ts.handsPlayed > 0 ? Math.round((ts.wins / ts.handsPlayed) * 1000) / 10 : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hand History */}
      {tab === 'hands' && (
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Hand ID</th><th>Tournament</th><th>Table</th><th>Seat</th>
                  <th style={{ textAlign: 'right' }}>Bet</th>
                  <th style={{ textAlign: 'right' }}>Won</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                  <th>Result</th><th>Hand</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {hands.map(h => (
                  <tr key={h.id}>
                    <td><code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{h.handId}</code></td>
                    <td style={{ fontSize: '0.85rem' }}>{h.tournamentName}</td>
                    <td style={{ fontSize: '0.85rem' }}>{h.tableName}</td>
                    <td>#{h.seatId}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{h.totalBet.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{h.winAmount.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                        className={h.netChips >= 0 ? 'profit-positive' : 'profit-negative'}>
                      {h.netChips >= 0 ? '+' : ''}{h.netChips.toLocaleString()}
                    </td>
                    <td>
                      {h.isWinner
                        ? <span className="badge badge-success">Won</span>
                        : <span className="badge badge-danger">Lost</span>}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{h.winningHand || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }} className="muted">{new Date(h.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {hands.length === 0 && <tr><td colSpan={10} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No hands found.</td></tr>}
              </tbody>
            </table>
          </div>
          {handsPages > 1 && (
            <div className="flex gap-sm mt" style={{ justifyContent: 'center' }}>
              <button className="btn btn-sm btn-secondary" disabled={handsPage === 0} onClick={() => setHandsPage(handsPage - 1)}>Previous</button>
              <span className="muted" style={{ padding: '0.35rem 0.5rem' }}>Page {handsPage + 1} of {handsPages}</span>
              <button className="btn btn-sm btn-secondary" disabled={handsPage >= handsPages - 1} onClick={() => setHandsPage(handsPage + 1)}>Next</button>
            </div>
          )}
        </div>
      )}

      {/* Tournaments */}
      {tab === 'tournaments' && (
        <div>
          {(!tournamentStats || tournamentStats.length === 0) ? (
            <div className="card"><p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No tournament history.</p></div>
          ) : (
            <div className="profile-grid">
              {tournamentStats.map((ts: any) => (
                <div key={ts.tournament.id} className="card">
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <strong>{ts.tournament.name}</strong>
                    <span className={`badge ${ts.tournament.status === 'active' ? 'badge-success' : ts.tournament.status === 'completed' ? 'badge-neutral' : 'badge-warning'}`}>{ts.tournament.status}</span>
                  </div>
                  <div className="grid-2" style={{ gap: '0.75rem' }}>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', display: 'block' }}>Rank</span>
                      <strong style={{ fontSize: '1.25rem' }}>{ts.rank ? `#${ts.rank}` : '—'}</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', display: 'block' }}>Points</span>
                      <strong style={{ fontSize: '1.25rem' }} className={ts.totalPoints >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {ts.totalPoints >= 0 ? '+' : ''}{ts.totalPoints.toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', display: 'block' }}>Hands Played</span>
                      <span>{ts.handsPlayed}</span>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: '0.75rem', display: 'block' }}>Wins</span>
                      <span>{ts.wins} ({ts.handsPlayed > 0 ? Math.round((ts.wins / ts.handsPlayed) * 1000) / 10 : 0}%)</span>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    {ts.tournament.variant} · {ts.tournament.limitType} · Joined {new Date(ts.registeredAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wallet */}
      {tab === 'wallet' && (
        <div>
          {wallets.length === 0 ? (
            <div className="card"><p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No wallet accounts.</p></div>
          ) : wallets.map((w: any) => (
            <div key={w.id} className="card mb">
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Wallet #{w.id}</h3>
                  <span className="muted">Event #{w.eventId}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>${w.balance.toLocaleString()}</span>
                  <br />
                  {w.lock ? <span className="badge badge-warning">Locked</span> : <span className="badge badge-success">Unlocked</span>}
                </div>
              </div>
              {w.transactions.length > 0 && (
                <table>
                  <thead>
                    <tr><th>Type</th><th>Amount</th><th>Before</th><th>After</th><th>Note</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {w.transactions.map((tx: any) => (
                      <tr key={tx.id}>
                        <td>
                          <span className={`badge ${tx.type === 'buyin' || tx.type === 'rebuy' ? 'badge-blue' : tx.type === 'cashout' ? 'badge-success' : tx.type === 'surrender' ? 'badge-warning' : 'badge-neutral'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }} className={tx.type === 'cashout' || tx.type === 'surrender' ? 'profit-positive' : ''}>
                          ${tx.amount.toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }} className="muted">${tx.balanceBefore.toLocaleString()}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>${tx.balanceAfter.toLocaleString()}</td>
                        <td className="muted" style={{ fontSize: '0.85rem' }}>{tx.note || '—'}</td>
                        <td className="muted" style={{ fontSize: '0.8rem' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit */}
      {tab === 'edit' && (
        <div className="grid-2">
          <div className="card">
            <h3>Edit Player Details</h3>
            {editSuccess && <div style={{ background: 'rgba(63, 185, 80, 0.15)', color: 'var(--accent-green)', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' }}>Player updated successfully.</div>}
            <form onSubmit={handleEdit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Screen Name</label>
                <input value={editForm.screenName} onChange={e => setEditForm({ ...editForm, screenName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Optional" />
              </div>
              <div className="flex gap-sm mt">
                <button className="btn btn-primary" type="submit" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
          <div className="card" style={{ background: 'rgba(248, 81, 73, 0.05)', borderColor: 'rgba(248, 81, 73, 0.2)' }}>
            <h3 style={{ color: 'var(--accent-red)' }}>Danger Zone</h3>
            <p className="muted" style={{ marginBottom: '1rem' }}>Permanently delete this player and all associated data including hand history, tournament registrations, wallet accounts, and scores.</p>
            <button className="btn btn-danger" onClick={handleDelete}>Delete Player</button>
          </div>
        </div>
      )}
    </div>
  );
}
