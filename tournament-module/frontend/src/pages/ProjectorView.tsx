import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useLiveUpdates } from '../hooks/useLiveUpdates';

export default function ProjectorView() {
  const { tournamentId: paramId } = useParams();
  const [tournamentId, setTournamentId] = useState<number | null>(paramId ? Number(paramId) : null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [tournamentInfo, setTournamentInfo] = useState<any>(null);

  useEffect(() => {
    if (!tournamentId) {
      api.getTournaments().then(setTournaments).catch(() => {});
    }
  }, [tournamentId]);

  const loadLeaderboard = useCallback(async () => {
    if (!tournamentId) return;
    try { setLeaderboard(await api.getLeaderboard(tournamentId)); } catch { /* ignore */ }
  }, [tournamentId]);

  const loadTournamentInfo = useCallback(async () => {
    if (!tournamentId) return;
    try { setTournamentInfo(await api.getTournament(tournamentId)); } catch { /* ignore */ }
  }, [tournamentId]);

  useEffect(() => {
    loadLeaderboard();
    loadTournamentInfo();
    const interval = setInterval(loadLeaderboard, 10_000);
    return () => clearInterval(interval);
  }, [loadLeaderboard, loadTournamentInfo]);

  useLiveUpdates(
    tournamentId ? [`leaderboard:${tournamentId}`] : [],
    (data) => {
      if (data.type === 'leaderboard_update') setLeaderboard(data.data);
    }
  );

  if (!tournamentId) {
    return (
      <div>
        <div className="page-header">
          <h1>Projector View</h1>
          <p>Select a tournament to display on the projector</p>
        </div>
        <div className="profile-grid mt">
          {tournaments.map(t => (
            <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setTournamentId(t.id)}>
              <div className="flex-between">
                <strong>{t.name}</strong>
                <span className={`badge ${t.status === 'active' ? 'badge-success' : t.status === 'paused' ? 'badge-warning' : 'badge-neutral'}`}>{t.status}</span>
              </div>
              <p className="muted" style={{ marginTop: '0.5rem' }}>{t.variant} &middot; {t.limitType}</p>
            </div>
          ))}
          {tournaments.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p className="muted">No tournaments found.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const rankClass = (rank: number) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  const attachedCount = tournamentInfo?.tournamentTables?.filter((t: any) => t.isAttached).length || 0;

  return (
    <div className="projector-view">
      <h1>{tournamentInfo?.name || `Tournament #${tournamentId}`}</h1>
      <div className="projector-subtitle">
        {tournamentInfo?.variant} &middot; {tournamentInfo?.limitType} &middot; {attachedCount} table{attachedCount !== 1 ? 's' : ''} active
        &middot; <span className={`badge ${tournamentInfo?.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{tournamentInfo?.status}</span>
      </div>

      <table className="projector-table">
        <thead>
          <tr>
            <th style={{ width: 80 }}>Rank</th>
            <th>Screen Name</th>
            <th>Player</th>
            <th style={{ textAlign: 'right' }}>Total Points</th>
            <th style={{ textAlign: 'right' }}>Hands Played</th>
            <th style={{ textAlign: 'right' }}>Last Hand</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map(e => (
            <tr key={e.playerId} className={rankClass(e.rank)}>
              <td style={{ fontSize: '1.3rem', fontWeight: 700 }}>#{e.rank}</td>
              <td><strong>{e.screenName}</strong></td>
              <td style={{ color: '#888' }}>{e.firstName} {e.lastName}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
                {e.totalPoints.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right' }}>{e.handsPlayed}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                className={e.lastDelta >= 0 ? 'profit-positive' : 'profit-negative'}>
                {e.lastDelta >= 0 ? '+' : ''}{e.lastDelta.toLocaleString()}
              </td>
            </tr>
          ))}
          {leaderboard.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#666', padding: '3rem' }}>
              Waiting for hands to be played...
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
