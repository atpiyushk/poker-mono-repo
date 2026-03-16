import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

type Step = 'tournament' | 'table' | 'seats';

interface Seat {
  id: number;
  seatNumber: number;
  playerId?: number;
  screenName?: string;
  state?: string;
}

interface SeatsResponse {
  seats: Seat[];
  seatedCount: number;
  canStart: boolean;
}

interface PlayerResult {
  id: number;
  screenName: string;
  firstName: string;
  lastName: string;
}

type ModalKind = 'onboard' | 'rebuy' | 'surrender' | 'detach' | null;

export default function DealerConsole() {
  const [step, setStep] = useState<Step>('tournament');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [attached, setAttached] = useState(false);
  const [seatsData, setSeatsData] = useState<SeatsResponse | null>(null);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [modalSeat, setModalSeat] = useState<Seat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerResult | null>(null);
  const [buyinAmount, setBuyinAmount] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step !== 'tournament') return;
    setLoading(true);
    api.getActiveTournaments()
      .then(setTournaments)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [step]);

  useEffect(() => {
    if (step !== 'table') return;
    setLoading(true);
    api.getTables()
      .then(setTables)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [step]);

  const fetchSeats = useCallback(() => {
    if (!selectedTableId || !selectedTournament) return;
    api.getSeats(selectedTableId, selectedTournament.id)
      .then((data: any) => setSeatsData(data))
      .catch(() => {});
  }, [selectedTableId, selectedTournament]);

  useEffect(() => {
    if (step !== 'seats') return;
    fetchSeats();
    const iv = setInterval(fetchSeats, 5000);
    return () => clearInterval(iv);
  }, [step, fetchSeats]);

  useEffect(() => {
    if (modalKind !== 'onboard') return;
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      api.searchPlayers(searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, modalKind]);

  function selectTournament(t: any) {
    setSelectedTournament(t);
    setStep('table');
    setError('');
  }

  async function attachTableFn() {
    if (!selectedTableId || !selectedTournament) return;
    setActionLoading(true);
    setError('');
    try {
      await api.dealerAttachTable(selectedTableId, selectedTournament.id);
      setAttached(true);
      setStep('seats');
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  function openOnboardModal(seat: Seat) {
    setModalSeat(seat);
    setModalKind('onboard');
    setSearchQuery(''); setSearchResults([]); setSelectedPlayer(null); setBuyinAmount(''); setError('');
  }

  function openActionModal(kind: ModalKind, seat: Seat) {
    setModalSeat(seat);
    setModalKind(kind);
    setAmountInput(''); setError('');
  }

  function closeModal() { setModalKind(null); setModalSeat(null); setError(''); }

  async function handleOnboard() {
    if (!selectedPlayer || !modalSeat || !selectedTournament) return;
    setActionLoading(true); setError('');
    try {
      await api.onboardPlayer(selectedTableId, {
        playerId: selectedPlayer.id, seatNumber: modalSeat.seatNumber,
        buyinAmount: Number(buyinAmount), tournamentId: selectedTournament.id,
      });
      closeModal(); fetchSeats();
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleRebuy() {
    if (!modalSeat) return;
    setActionLoading(true); setError('');
    try {
      await api.rebuy(selectedTableId, { playerId: modalSeat.playerId!, amount: Number(amountInput), tournamentId: selectedTournament.id });
      closeModal(); fetchSeats();
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleSitout(seat: Seat) {
    setActionLoading(true); setError('');
    try { await api.sitout(selectedTableId, seat.id); fetchSeats(); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleReturn(seat: Seat) {
    setActionLoading(true); setError('');
    try { await api.returnSeat(selectedTableId, seat.id); fetchSeats(); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleSurrender() {
    if (!modalSeat) return;
    setActionLoading(true); setError('');
    try { await api.surrender(selectedTableId, modalSeat.id, Number(amountInput)); closeModal(); fetchSeats(); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleDetach() {
    if (!modalSeat) return;
    setActionLoading(true); setError('');
    try { await api.detachPlayer(selectedTableId, modalSeat.id, Number(amountInput)); closeModal(); fetchSeats(); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  }

  function buildSeatGrid(): Seat[] {
    const grid: Seat[] = Array.from({ length: 8 }, (_, i) => ({ id: 0, seatNumber: i + 1 }));
    if (seatsData?.seats) {
      for (const s of seatsData.seats) {
        const idx = s.seatNumber - 1;
        if (idx >= 0 && idx < 8) grid[idx] = s;
      }
    }
    return grid;
  }

  function seatStateClass(seat: Seat): string {
    if (!seat.playerId) return 'empty';
    if (seat.state === 'sitout') return 'sitout';
    return 'occupied';
  }

  function seatStateBadge(seat: Seat) {
    if (!seat.playerId) return null;
    const stateMap: Record<string, { cls: string; label: string }> = {
      seated: { cls: 'badge-success', label: 'Seated' },
      sitout: { cls: 'badge-warning', label: 'Sit Out' },
      surrendered: { cls: 'badge-danger', label: 'Surrendered' },
      detached: { cls: 'badge-danger', label: 'Detached' },
    };
    const info = stateMap[seat.state || 'seated'] || stateMap.seated;
    return <span className={`badge ${info.cls}`}>{info.label}</span>;
  }

  if (step === 'tournament') {
    return (
      <div>
        <div className="page-header">
          <h1>Dealer Console</h1>
          <p>Step 1: Select an active tournament to manage</p>
        </div>
        {error && <div className="login-error mb">{error}</div>}
        {loading ? (
          <p className="muted">Loading tournaments...</p>
        ) : tournaments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="muted">No active tournaments found. Ask an admin to start one.</p>
          </div>
        ) : (
          <div className="profile-grid">
            {tournaments.map((t: any) => (
              <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => selectTournament(t)}>
                <div className="flex-between">
                  <strong>{t.name}</strong>
                  <span className="badge badge-success">{t.status || 'Active'}</span>
                </div>
                {t.eventName && <p className="muted" style={{ marginTop: '0.5rem' }}>{t.eventName}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === 'table') {
    return (
      <div>
        <div className="page-header">
          <h1>Dealer Console</h1>
          <p>Step 2: Select and attach a table</p>
        </div>
        <div className="card mb">
          <div className="flex-between">
            <span>Tournament: <strong>{selectedTournament?.name}</strong></span>
            <button className="btn btn-sm btn-secondary" onClick={() => { setStep('tournament'); setAttached(false); }}>Change</button>
          </div>
        </div>
        {error && <div className="login-error mb">{error}</div>}
        {loading ? (
          <p className="muted">Loading tables...</p>
        ) : (
          <div className="card">
            <div className="form-group">
              <label>Select Table</label>
              <select value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)}>
                <option value="">-- Choose a table --</option>
                {tables.map((t: any) => (
                  <option key={t.tableId || t.id} value={t.tableId || t.id}>
                    {t.displayName || t.tableId || t.id}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary mt" disabled={!selectedTableId || actionLoading} onClick={attachTableFn}>
              {actionLoading ? 'Attaching...' : 'Attach Table'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const seats = buildSeatGrid();
  const seatedCount = seatsData?.seatedCount ?? 0;
  const needMore = 3 - seatedCount;

  return (
    <div>
      <div className="page-header">
        <h1>Dealer Console</h1>
      </div>

      <div className="card mb">
        <div className="flex-between">
          <div className="flex gap">
            <span className="muted">Tournament: <strong style={{ color: 'var(--text-primary)' }}>{selectedTournament?.name}</strong></span>
            <span className="muted">|</span>
            <span className="muted">Table: <strong style={{ color: 'var(--text-primary)' }}>{selectedTableId}</strong></span>
          </div>
          <div className="flex gap-sm">
            <span style={{ fontWeight: 600 }}>Players: {seatedCount}/8</span>
            {seatedCount < 3 ? (
              <span className="badge badge-danger">Need {needMore} more</span>
            ) : (
              <span className="badge badge-success">Ready to play</span>
            )}
          </div>
        </div>
      </div>

      {error && <div className="login-error mb">{error}</div>}

      <div className="seat-grid">
        {seats.map(seat => (
          <div key={seat.seatNumber} className={`seat-card ${seatStateClass(seat)}`}>
            <span className="seat-number">Seat {seat.seatNumber}</span>

            {seat.playerId ? (
              <>
                <span className="seat-player">{seat.screenName || `Player #${seat.playerId}`}</span>
                {seatStateBadge(seat)}
                <div className="flex gap-sm mt" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  {seat.state !== 'surrendered' && seat.state !== 'detached' && (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => openActionModal('rebuy', seat)}>Rebuy</button>
                      {seat.state === 'sitout' ? (
                        <button className="btn btn-sm btn-success" onClick={() => handleReturn(seat)} disabled={actionLoading}>Return</button>
                      ) : (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleSitout(seat)} disabled={actionLoading}>Sit Out</button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => openActionModal('surrender', seat)}>Surrender</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openActionModal('detach', seat)}>Detach</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="muted" style={{ fontSize: '0.85rem' }}>Empty</span>
                <button className="btn btn-sm btn-primary" style={{ marginTop: '0.25rem' }} onClick={() => openOnboardModal(seat)}>+ Onboard</button>
              </>
            )}
          </div>
        ))}
      </div>

      {modalKind === 'onboard' && modalSeat && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Onboard Player — Seat {modalSeat.seatNumber}</h3>
            {error && <div className="login-error mb">{error}</div>}
            <div className="form-group">
              <label>Search Player</label>
              <input placeholder="Type name or screen name..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedPlayer(null); }} autoFocus />
            </div>
            {searchLoading && <p className="muted">Searching...</p>}
            {!selectedPlayer && searchResults.length > 0 && (
              <div className="card" style={{ maxHeight: '180px', overflowY: 'auto', padding: '0.5rem' }}>
                {searchResults.map(p => (
                  <div key={p.id} className="flex-between" style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: 6 }}
                    onClick={() => setSelectedPlayer(p)}>
                    <strong>{p.screenName}</strong>
                    <span className="muted">{p.firstName} {p.lastName}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedPlayer && (
              <div className="card flex-between mb">
                <div>
                  <strong>{selectedPlayer.screenName}</strong>
                  <span className="muted" style={{ marginLeft: '0.5rem' }}>{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedPlayer(null)}>Change</button>
              </div>
            )}
            <div className="form-group">
              <label>Buy-in Amount</label>
              <input type="number" min="0" placeholder="Enter buy-in amount" value={buyinAmount} onChange={e => setBuyinAmount(e.target.value)} />
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-primary" disabled={!selectedPlayer || !buyinAmount || actionLoading} onClick={handleOnboard}>
                {actionLoading ? 'Onboarding...' : 'Onboard'}
              </button>
              <button className="btn btn-secondary" onClick={closeModal} disabled={actionLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modalKind === 'rebuy' && modalSeat && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Rebuy — {modalSeat.screenName || `Seat ${modalSeat.seatNumber}`}</h3>
            {error && <div className="login-error mb">{error}</div>}
            <div className="form-group">
              <label>Rebuy Amount</label>
              <input type="number" min="0" placeholder="Enter amount" value={amountInput} onChange={e => setAmountInput(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-primary" disabled={!amountInput || actionLoading} onClick={handleRebuy}>
                {actionLoading ? 'Processing...' : 'Confirm Rebuy'}
              </button>
              <button className="btn btn-secondary" onClick={closeModal} disabled={actionLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modalKind === 'surrender' && modalSeat && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Surrender — {modalSeat.screenName || `Seat ${modalSeat.seatNumber}`}</h3>
            {error && <div className="login-error mb">{error}</div>}
            <div className="form-group">
              <label>Cashout Amount</label>
              <input type="number" min="0" placeholder="Enter cashout amount" value={amountInput} onChange={e => setAmountInput(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-danger" disabled={!amountInput || actionLoading} onClick={handleSurrender}>
                {actionLoading ? 'Processing...' : 'Confirm Surrender'}
              </button>
              <button className="btn btn-secondary" onClick={closeModal} disabled={actionLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modalKind === 'detach' && modalSeat && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Detach Player — {modalSeat.screenName || `Seat ${modalSeat.seatNumber}`}</h3>
            {error && <div className="login-error mb">{error}</div>}
            <div className="form-group">
              <label>Cashout Amount</label>
              <input type="number" min="0" placeholder="Enter cashout amount" value={amountInput} onChange={e => setAmountInput(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-sm mt">
              <button className="btn btn-danger" disabled={!amountInput || actionLoading} onClick={handleDetach}>
                {actionLoading ? 'Processing...' : 'Confirm Detach'}
              </button>
              <button className="btn btn-secondary" onClick={closeModal} disabled={actionLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
