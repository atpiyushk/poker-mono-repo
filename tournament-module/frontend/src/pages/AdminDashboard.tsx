import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useLiveUpdates } from '../hooks/useLiveUpdates';

type Tab = 'tournaments' | 'tables' | 'health' | 'leaderboard';

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('tournaments');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showEventModal, setShowEventModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);

  const [eventForm, setEventForm] = useState({ name: '', description: '' });
  const [tournamentForm, setTournamentForm] = useState({
    name: '', family: 'Poker', variant: 'TexasHoldem', limitType: 'NoLimit',
  });
  const [tableForm, setTableForm] = useState({ tableId: '', url: '', displayName: '' });
  const [editName, setEditName] = useState('');

  const loadEvents = useCallback(async () => {
    try { setEvents(await api.getEvents()); } catch (e: any) { setError(e.message); }
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      setTournaments(await api.getTournaments(selectedEvent?.id));
    } catch (e: any) { setError(e.message); }
  }, [selectedEvent]);

  const loadTables = useCallback(async () => {
    try { setTables(await api.getTables()); } catch (e: any) { setError(e.message); }
  }, []);

  const loadHealth = useCallback(async () => {
    try { setHealth(await api.getHealth()); } catch (e: any) { setError(e.message); }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (!selectedTournament) return;
    try { setLeaderboard(await api.getAdminLeaderboard(selectedTournament)); } catch (e: any) { setError(e.message); }
  }, [selectedTournament]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { if (selectedEvent) loadTournaments(); }, [loadTournaments, selectedEvent]);
  useEffect(() => { if (tab === 'tables') loadTables(); }, [tab, loadTables]);
  useEffect(() => { if (tab === 'health') loadHealth(); }, [tab, loadHealth]);
  useEffect(() => { if (tab === 'leaderboard') loadLeaderboard(); }, [tab, loadLeaderboard]);

  const channels = selectedTournament ? [`leaderboard:${selectedTournament}`, 'health'] : ['health'];
  useLiveUpdates(channels, (data) => {
    if (data.type === 'leaderboard_update') setLeaderboard(data.data);
    if (data.type === 'health_update') loadHealth();
  });

  const createEvent = async () => {
    setLoading(true);
    try {
      await api.createEvent(eventForm.name, eventForm.description);
      setShowEventModal(false);
      setEventForm({ name: '', description: '' });
      await loadEvents();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const createTournament = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      await api.createTournament({ eventId: selectedEvent.id, ...tournamentForm });
      setShowTournamentModal(false);
      setTournamentForm({ name: '', family: 'Poker', variant: 'TexasHoldem', limitType: 'NoLimit' });
      await loadTournaments();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const registerTable = async () => {
    setLoading(true);
    try {
      await api.registerTable(tableForm.tableId, tableForm.url, tableForm.displayName);
      setShowTableModal(false);
      setTableForm({ tableId: '', url: '', displayName: '' });
      await loadTables();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleTournamentAction = async (id: number, action: string) => {
    setLoading(true);
    try {
      if (action === 'start') await api.startTournament(id);
      else if (action === 'pause') await api.pauseTournament(id);
      else if (action === 'complete') await api.completeTournament(id);
      else if (action === 'delete') await api.deleteTournament(id);
      else if (action === 'force-delete') await api.deleteTournament(id, true);
      await loadTournaments();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editingTournament) return;
    setLoading(true);
    try {
      await api.updateTournament(editingTournament.id, { name: editName });
      setEditingTournament(null);
      await loadTournaments();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const attachTable = async (tableId: string) => {
    if (!selectedTournament) { setError('Select a tournament first'); return; }
    setLoading(true);
    try {
      await api.attachTable(selectedTournament, tableId);
      await loadTables();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const detachTable = async (tableId: string) => {
    if (!selectedTournament) return;
    setLoading(true);
    try {
      await api.detachTable(selectedTournament, tableId);
      await loadTables();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'badge-neutral', active: 'badge-success', paused: 'badge-warning',
      completed: 'badge-success', cancelled: 'badge-danger',
    };
    return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
  };

  const totalPlayers = tournaments.reduce((sum, t) => sum + (t._count?.registrations || 0), 0);

  return (
    <div>
      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button className="btn btn-sm btn-secondary" style={{ marginLeft: 8 }} onClick={() => setError('')}>dismiss</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{events.length}</span>
          <span className="stat-label">Events</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{tournaments.length}</span>
          <span className="stat-label">Tournaments</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalPlayers}</span>
          <span className="stat-label">Players</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{tournaments.filter(t => t.status === 'active').length}</span>
          <span className="stat-label">Active</span>
        </div>
      </div>

      <div className="tabs">
        {(['tournaments', 'tables', 'health', 'leaderboard'] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'tournaments' && (
        <>
          <div className="flex-between mb">
            <div className="page-header">
              <h1>Events & Tournaments</h1>
              <p>Manage your poker events and tournament structure</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowEventModal(true)}>+ Create Event</button>
          </div>

          <div className="profile-grid mb">
            {events.map(ev => (
              <div
                key={ev.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedEvent?.id === ev.id ? 'var(--accent-gold)' : undefined,
                  borderWidth: selectedEvent?.id === ev.id ? '2px' : undefined,
                }}
                onClick={() => setSelectedEvent(ev)}
              >
                <div className="flex-between">
                  <strong>{ev.name}</strong>
                  {selectedEvent?.id === ev.id && <span className="badge badge-warning">selected</span>}
                </div>
                <p className="muted" style={{ marginTop: '0.5rem' }}>{ev.description || 'No description'}</p>
                <p className="muted" style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
                  {ev.tournaments?.length || 0} tournament{(ev.tournaments?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
            {events.length === 0 && <p className="muted">No events yet. Create one to get started.</p>}
          </div>

          {selectedEvent && (
            <>
              <div className="flex-between mb">
                <h2>Tournaments in "{selectedEvent.name}"</h2>
                <button className="btn btn-primary" onClick={() => setShowTournamentModal(true)}>+ Create Tournament</button>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Family</th><th>Variant</th><th>Limit</th>
                      <th>Status</th><th>Players</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map(t => (
                      <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTournament(t.id)}>
                        <td>
                          <strong>{t.name}</strong>
                          {selectedTournament === t.id && <span className="badge badge-warning" style={{ marginLeft: 8 }}>selected</span>}
                        </td>
                        <td>{t.family}</td>
                        <td>{t.variant}</td>
                        <td>{t.limitType}</td>
                        <td>{statusBadge(t.status)}</td>
                        <td>{t._count?.registrations || 0}</td>
                        <td>
                          <div className="flex gap-sm" onClick={e => e.stopPropagation()}>
                            {t.status === 'draft' && <button className="btn btn-sm btn-success" onClick={() => handleTournamentAction(t.id, 'start')}>Start</button>}
                            {t.status === 'active' && <button className="btn btn-sm btn-secondary" onClick={() => handleTournamentAction(t.id, 'pause')}>Pause</button>}
                            {t.status === 'paused' && <button className="btn btn-sm btn-success" onClick={() => handleTournamentAction(t.id, 'start')}>Resume</button>}
                            {(t.status === 'active' || t.status === 'paused') && <button className="btn btn-sm btn-secondary" onClick={() => handleTournamentAction(t.id, 'complete')}>Complete</button>}
                            <button className="btn btn-sm btn-secondary" onClick={() => { setEditingTournament(t); setEditName(t.name); }}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleTournamentAction(t.id, t.status === 'active' ? 'force-delete' : 'delete')}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tournaments.length === 0 && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No tournaments yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'tables' && (
        <>
          <div className="flex-between mb">
            <div className="page-header">
              <h1>Table Registry</h1>
              <p>Register and manage poker tables</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowTableModal(true)}>+ Register Table</button>
          </div>
          {selectedTournament && <p className="muted mb">Tournament #{selectedTournament} selected — use Attach/Detach buttons below.</p>}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Table ID</th><th>URL</th><th>Name</th><th>Health</th><th>Attached To</th><th>Actions</th></tr></thead>
              <tbody>
                {tables.map(t => {
                  const healthStatus = t.systemHealth?.wsStatus || 'disconnected';
                  const attachedTo = t.tournamentTables?.[0]?.tournament;
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.tableId}</strong></td>
                      <td><code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.url}</code></td>
                      <td>{t.displayName}</td>
                      <td><span className={`status-dot status-${healthStatus}`} />{healthStatus}</td>
                      <td>{attachedTo ? <span className="badge badge-success">{attachedTo.name}</span> : <span className="muted">—</span>}</td>
                      <td>
                        <div className="flex gap-sm">
                          {selectedTournament && !attachedTo && (
                            <button className="btn btn-sm btn-success" onClick={() => attachTable(t.tableId)}>Attach</button>
                          )}
                          {selectedTournament && attachedTo && (
                            <button className="btn btn-sm btn-danger" onClick={() => detachTable(t.tableId)}>Detach</button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={async () => { await api.deleteTable(t.id); loadTables(); }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tables.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No tables registered.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'health' && (
        <>
          <div className="flex-between mb">
            <div className="page-header">
              <h1>System Health</h1>
              <p>WebSocket connection status for all tables</p>
            </div>
            <button className="btn btn-secondary" onClick={loadHealth}>Refresh</button>
          </div>
          <div className="profile-grid">
            {health.map((h: any) => (
              <div key={h.id} className="card">
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <strong>{h.tableRegistry?.displayName || h.tableRegistry?.tableId}</strong>
                  <span className={`status-dot status-${h.wsStatus}`} />
                </div>
                <div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    Status: <span className={`badge ${h.wsStatus === 'connected' ? 'badge-success' : h.wsStatus === 'error' ? 'badge-warning' : 'badge-danger'}`}>{h.wsStatus}</span>
                  </div>
                  <div className="muted">Last Message: {h.lastMessageAt ? new Date(h.lastMessageAt).toLocaleTimeString() : 'Never'}</div>
                  <div className="muted">Reconnects: {h.reconnectCount}</div>
                  {h.lastError && <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Error: {h.lastError}</div>}
                </div>
              </div>
            ))}
            {health.length === 0 && <p className="muted">No health data. Register tables to see status.</p>}
          </div>
        </>
      )}

      {tab === 'leaderboard' && (
        <>
          <div className="flex-between mb">
            <div className="page-header">
              <h1>Leaderboard {selectedTournament ? `(Tournament #${selectedTournament})` : ''}</h1>
              <p>Live tournament rankings</p>
            </div>
            {selectedTournament && <button className="btn btn-secondary" onClick={loadLeaderboard}>Refresh</button>}
          </div>
          {!selectedTournament ? (
            <div className="card">
              <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Select a tournament from the Tournaments tab first.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead><tr><th>Rank</th><th>Screen Name</th><th>Player</th><th>Total Points</th><th>Hands</th><th>Last Delta</th></tr></thead>
                <tbody>
                  {leaderboard.map(e => (
                    <tr key={e.playerId}>
                      <td><strong>#{e.rank}</strong></td>
                      <td><strong style={{ color: e.rank <= 3 ? 'var(--accent-gold)' : undefined }}>{e.screenName}</strong></td>
                      <td>{e.firstName} {e.lastName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{e.totalPoints.toLocaleString()}</td>
                      <td>{e.handsPlayed}</td>
                      <td className={e.lastDelta >= 0 ? 'profit-positive' : 'profit-negative'} style={{ fontFamily: 'var(--font-mono)' }}>
                        {e.lastDelta >= 0 ? '+' : ''}{e.lastDelta.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '2rem' }}>No scores recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Event</h3>
            <div className="form-group">
              <label>Name</label>
              <input value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} placeholder="e.g., Las Vegas Championship 2026" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} rows={3} placeholder="Optional description..." />
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-primary" onClick={createEvent} disabled={loading || !eventForm.name}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowEventModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTournamentModal && (
        <div className="modal-overlay" onClick={() => setShowTournamentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Tournament</h3>
            <div className="form-group">
              <label>Name</label>
              <input value={tournamentForm.name} onChange={e => setTournamentForm({ ...tournamentForm, name: e.target.value })} placeholder="e.g., Main Event - NLHE" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Game Family</label>
                <select value={tournamentForm.family} onChange={e => setTournamentForm({ ...tournamentForm, family: e.target.value })}>
                  <option value="Poker">Poker</option>
                  <option value="TeenPatti">Teen Patti</option>
                </select>
              </div>
              <div className="form-group">
                <label>Variant</label>
                <select value={tournamentForm.variant} onChange={e => setTournamentForm({ ...tournamentForm, variant: e.target.value })}>
                  <option value="TexasHoldem">Texas Hold'em</option>
                  <option value="Omaha">Omaha</option>
                  <option value="Pineapple">Pineapple</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Limit Type</label>
              <select value={tournamentForm.limitType} onChange={e => setTournamentForm({ ...tournamentForm, limitType: e.target.value })}>
                <option value="NoLimit">No Limit</option>
                <option value="PotLimit">Pot Limit</option>
                <option value="TableLimit">Table Limit</option>
              </select>
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-primary" onClick={createTournament} disabled={loading || !tournamentForm.name}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowTournamentModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingTournament && (
        <div className="modal-overlay" onClick={() => setEditingTournament(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Tournament</h3>
            <div className="form-group">
              <label>Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-primary" onClick={saveEdit} disabled={loading}>Save</button>
              <button className="btn btn-secondary" onClick={() => setEditingTournament(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTableModal && (
        <div className="modal-overlay" onClick={() => setShowTableModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Register Table</h3>
            <div className="form-group">
              <label>Table ID</label>
              <input value={tableForm.tableId} onChange={e => setTableForm({ ...tableForm, tableId: e.target.value })} placeholder="e.g., 4000" />
            </div>
            <div className="form-group">
              <label>URL</label>
              <input value={tableForm.url} onChange={e => setTableForm({ ...tableForm, url: e.target.value })} placeholder="e.g., ws://192.168.1.10:9000" />
            </div>
            <div className="form-group">
              <label>Display Name</label>
              <input value={tableForm.displayName} onChange={e => setTableForm({ ...tableForm, displayName: e.target.value })} placeholder="e.g., Table 1 - Main Hall" />
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-primary" onClick={registerTable} disabled={loading || !tableForm.tableId || !tableForm.url || !tableForm.displayName}>Register</button>
              <button className="btn btn-secondary" onClick={() => setShowTableModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
