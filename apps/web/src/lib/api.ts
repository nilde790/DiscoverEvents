import type { EventDetail, EventInput, EventSummary, OrganizerRequest, User } from '@discoverevent/shared/types';
import type { LoginInput, RegisterInput } from '@discoverevent/shared/validation';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Risposta di login, registrazione e /auth/me. */
export interface SessionInfo {
  user: User | null;
  organizerRequest: OrganizerRequest | null;
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      // Il cookie di sessione viaggia da solo con ogni richiesta allo stesso sito.
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Server non raggiungibile: è avviato con "npm run dev"?');
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Senza corpo JSON l'errore non viene dal nostro server ma dal proxy di Vite: il backend è spento.
    const fallback = res.status >= 500 ? 'Server non raggiungibile: è avviato con "npm run dev"?' : `Errore ${res.status}`;
    throw new ApiError(res.status, data?.error ?? fallback, data?.fields);
  }
  return data as T;
}

/** Client dell'API: un metodo per ogni rotta del server. */
export const api = {
  me: () => request<SessionInfo>('/auth/me'),
  login: (input: LoginInput) => request<SessionInfo>('/auth/login', 'POST', input),
  register: (input: RegisterInput) => request<SessionInfo>('/auth/register', 'POST', input),
  logout: () => request<void>('/auth/logout', 'POST'),

  requestOrganizer: (message: string) => request<OrganizerRequest>('/organizer-requests', 'POST', { message }),
  adminRequests: (onlyPending: boolean) =>
    request<OrganizerRequest[]>(`/admin/organizer-requests${onlyPending ? '?status=pending' : ''}`),
  decideRequest: (id: number, decision: 'approved' | 'rejected') =>
    request<OrganizerRequest>(`/admin/organizer-requests/${id}`, 'PUT', { decision }),

  events: () => request<EventSummary[]>('/events'),
  event: (id: number) => request<EventDetail>(`/events/${id}`),
  createEvent: (input: EventInput) => request<EventDetail>('/events', 'POST', input),
  updateEvent: (id: number, input: EventInput) => request<EventDetail>(`/events/${id}`, 'PUT', input),
  deleteEvent: (id: number) => request<void>(`/events/${id}`, 'DELETE'),
  setRegistration: (id: number, registered: boolean) =>
    request<EventSummary>(`/events/${id}/registration`, registered ? 'PUT' : 'DELETE'),
  setFavorite: (id: number, favorite: boolean) =>
    request<EventSummary>(`/events/${id}/favorite`, favorite ? 'PUT' : 'DELETE'),
};
