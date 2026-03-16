const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('tm_token');
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string, role: 'admin' | 'dealer') =>
    request<{ token: string; role: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    }),

  // Events
  getEvents: () => request<any[]>('/admin/events'),
  createEvent: (name: string, description?: string) =>
    request<any>('/admin/events', { method: 'POST', body: JSON.stringify({ name, description }) }),

  // Tournaments
  getTournaments: (eventId?: number) =>
    request<any[]>(`/admin/tournaments${eventId ? `?eventId=${eventId}` : ''}`),
  getTournament: (id: number) => request<any>(`/admin/tournaments/${id}`),
  createTournament: (data: any) =>
    request<any>('/admin/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  updateTournament: (id: number, data: any) =>
    request<any>(`/admin/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTournament: (id: number, force = false) =>
    request<any>(`/admin/tournaments/${id}?force=${force}`, { method: 'DELETE' }),
  startTournament: (id: number) =>
    request<any>(`/admin/tournaments/${id}/start`, { method: 'POST' }),
  pauseTournament: (id: number) =>
    request<any>(`/admin/tournaments/${id}/pause`, { method: 'POST' }),
  completeTournament: (id: number) =>
    request<any>(`/admin/tournaments/${id}/complete`, { method: 'POST' }),

  // Tables
  getTables: () => request<any[]>('/admin/tables'),
  registerTable: (tableId: string, url: string, displayName: string) =>
    request<any>('/admin/tables', { method: 'POST', body: JSON.stringify({ tableId, url, displayName }) }),
  deleteTable: (id: number) =>
    request<any>(`/admin/tables/${id}`, { method: 'DELETE' }),
  attachTable: (tournamentId: number, tableId: string) =>
    request<any>(`/admin/tournaments/${tournamentId}/tables/${tableId}/attach`, { method: 'POST' }),
  detachTable: (tournamentId: number, tableId: string) =>
    request<any>(`/admin/tournaments/${tournamentId}/tables/${tableId}/detach`, { method: 'POST' }),

  // Leaderboard
  getLeaderboard: (tournamentId: number) =>
    request<any[]>(`/leaderboard/${tournamentId}`),
  getAdminLeaderboard: (tournamentId: number) =>
    request<any[]>(`/admin/tournaments/${tournamentId}/leaderboard`),

  // Health
  getHealth: () => request<any[]>('/admin/system/health'),

  // Dealer
  getActiveTournaments: () => request<any[]>('/dealer/tournaments/active'),
  searchPlayers: (q: string) => request<any[]>(`/dealer/players/search?q=${encodeURIComponent(q)}`),
  dealerAttachTable: (tableId: string, tournamentId: number) =>
    request<any>(`/dealer/table/${tableId}/attach`, {
      method: 'POST', body: JSON.stringify({ tournamentId }),
    }),
  onboardPlayer: (tableId: string, data: { playerId: number; seatNumber: number; buyinAmount: number; tournamentId: number }) =>
    request<any>(`/dealer/table/${tableId}/onboard`, { method: 'POST', body: JSON.stringify(data) }),
  rebuy: (tableId: string, data: { playerId: number; amount: number; tournamentId: number }) =>
    request<any>(`/dealer/table/${tableId}/rebuy`, { method: 'POST', body: JSON.stringify(data) }),
  sitout: (tableId: string, seatId: number) =>
    request<any>(`/dealer/table/${tableId}/sitout/${seatId}`, { method: 'POST' }),
  returnSeat: (tableId: string, seatId: number) =>
    request<any>(`/dealer/table/${tableId}/return/${seatId}`, { method: 'POST' }),
  surrender: (tableId: string, seatId: number, cashoutAmount: number) =>
    request<any>(`/dealer/table/${tableId}/surrender/${seatId}`, {
      method: 'POST', body: JSON.stringify({ cashoutAmount }),
    }),
  detachPlayer: (tableId: string, seatId: number, cashoutAmount: number) =>
    request<any>(`/dealer/table/${tableId}/detach/${seatId}`, {
      method: 'POST', body: JSON.stringify({ cashoutAmount }),
    }),
  getSeats: (tableId: string, tournamentId: number) =>
    request<any>(`/dealer/table/${tableId}/seats?tournamentId=${tournamentId}`),

  // Players (admin)
  getPlayers: (params?: { q?: string; sort?: string; order?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.order) sp.set('order', params.order);
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return request<any>(`/admin/players${qs ? `?${qs}` : ''}`);
  },
  getPlayer: (id: number) => request<any>(`/admin/players/${id}`),
  updatePlayer: (id: number, data: any) =>
    request<any>(`/admin/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlayer: (id: number, force = false) =>
    request<any>(`/admin/players/${id}?force=${force}`, { method: 'DELETE' }),
  getPlayerHands: (id: number, params?: { limit?: number; offset?: number; tournamentId?: number }) => {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    if (params?.tournamentId) sp.set('tournamentId', String(params.tournamentId));
    const qs = sp.toString();
    return request<any>(`/admin/players/${id}/hands${qs ? `?${qs}` : ''}`);
  },
  getPlayerWallet: (id: number) => request<any[]>(`/admin/players/${id}/wallet`),
  getPlayerPoints: (id: number, params?: { limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return request<any>(`/admin/players/${id}/points${qs ? `?${qs}` : ''}`);
  },
  getPlayerStatsOverview: () => request<any>('/admin/players/stats/overview'),

  // Registration (public)
  register: (data: { firstName: string; lastName: string; email: string; phone?: string; screenName: string }) =>
    request<any>('/register', { method: 'POST', body: JSON.stringify(data) }),
  checkScreenName: (name: string) =>
    request<{ available: boolean }>(`/register/check-screen-name?name=${encodeURIComponent(name)}`),
  getBadge: (playerId: number) =>
    request<any>(`/register/players/${playerId}/badge`),
};
