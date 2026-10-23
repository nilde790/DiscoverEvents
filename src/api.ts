import type { EventDetail, EventInput, EventSummary, User } from '../shared/types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, userId: number | null, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': String(userId) } : {}),
      },
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

/** Client dell'API per l'utente indicato: un metodo per ogni rotta del server. */
export function createApi(userId: number | null) {
  return {
    users: () => request<User[]>('/users', userId),
    events: () => request<EventSummary[]>('/events', userId),
    event: (id: number) => request<EventDetail>(`/events/${id}`, userId),
    createEvent: (input: EventInput) => request<EventDetail>('/events', userId, 'POST', input),
    updateEvent: (id: number, input: EventInput) => request<EventDetail>(`/events/${id}`, userId, 'PUT', input),
    deleteEvent: (id: number) => request<void>(`/events/${id}`, userId, 'DELETE'),
    setRegistration: (id: number, registered: boolean) =>
      request<EventSummary>(`/events/${id}/registration`, userId, registered ? 'PUT' : 'DELETE'),
    setFavorite: (id: number, favorite: boolean) =>
      request<EventSummary>(`/events/${id}/favorite`, userId, favorite ? 'PUT' : 'DELETE'),
  };
}

export type Api = ReturnType<typeof createApi>;
