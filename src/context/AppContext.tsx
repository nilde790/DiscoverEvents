import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EventInput, EventSummary, User } from '../../shared/types';
import { createApi, type Api } from '../api';

const USER_KEY = 'discoverevent.userId';

interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

interface AppState {
  api: Api;
  users: User[];
  currentUser: User | null;
  setCurrentUserId: (id: number) => void;
  events: EventSummary[];
  loading: boolean;
  error: string | null;
  toggleFavorite: (e: EventSummary) => Promise<void>;
  toggleRegistration: (e: EventSummary) => Promise<void>;
  saveEvent: (input: EventInput, id?: number) => Promise<EventSummary>;
  deleteEvent: (id: number) => Promise<void>;
  toast: Toast | null;
  notify: (text: string, kind?: Toast['kind']) => void;
}

const AppContext = createContext<AppState | null>(null);

function readStoredUserId(): number | null {
  try {
    const v = Number(localStorage.getItem(USER_KEY));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Stato globale: utente demo selezionato, eventi e azioni che li modificano. */
export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<number | null>(readStoredUserId);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const api = useMemo(() => createApi(userId), [userId]);
  const currentUser = users.find((u) => u.id === userId) ?? null;

  const notify = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now();
    setToast({ id, text, kind });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  }, []);

  // Utenti: caricati una volta; se non c'è un utente salvato valido si parte dal primo partecipante.
  useEffect(() => {
    createApi(null)
      .users()
      .then((list) => {
        setUsers(list);
        setUserId((id) =>
          list.some((u) => u.id === id) ? id : (list.find((u) => u.role === 'participant') ?? list[0])?.id ?? null,
        );
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  // Eventi: ricaricati quando cambia utente, perché preferiti e iscrizioni dipendono da chi guarda.
  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    setLoading(true);
    api
      .events()
      .then((list) => !cancelled && (setEvents(list), setError(null)))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, userId]);

  const setCurrentUserId = useCallback((id: number) => {
    setUserId(id);
    try {
      localStorage.setItem(USER_KEY, String(id));
    } catch {
      /* la scelta vale comunque per questa sessione */
    }
  }, []);

  const replaceEvent = useCallback((updated: EventSummary) => {
    setEvents((list) => {
      const exists = list.some((e) => e.id === updated.id);
      const next = exists ? list.map((e) => (e.id === updated.id ? updated : e)) : [...list, updated];
      return next.sort((a, b) => a.start.localeCompare(b.start));
    });
  }, []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, success?: string): Promise<T> => {
      try {
        const result = await action();
        if (success) notify(success);
        return result;
      } catch (e) {
        notify(e instanceof Error ? e.message : String(e), 'error');
        throw e;
      }
    },
    [notify],
  );

  const value: AppState = {
    api,
    users,
    currentUser,
    setCurrentUserId,
    events,
    loading,
    error,
    toast,
    notify,
    toggleFavorite: (e) =>
      run(() => api.setFavorite(e.id, !e.isFavorite))
        .then(replaceEvent)
        .catch(() => {}),
    toggleRegistration: (e) =>
      run(
        () => api.setRegistration(e.id, !e.isRegistered),
        e.isRegistered ? 'Iscrizione annullata' : 'Iscrizione confermata!',
      )
        .then(replaceEvent)
        .catch(() => {}),
    saveEvent: async (input, id) => {
      // Gli errori di validazione vengono mostrati dal form, quindi qui non si usa il toast.
      const saved = id === undefined ? await api.createEvent(input) : await api.updateEvent(id, input);
      replaceEvent(saved);
      notify(id === undefined ? 'Evento creato' : 'Modifiche salvate');
      return saved;
    },
    deleteEvent: async (id) => {
      await run(() => api.deleteEvent(id), 'Evento eliminato');
      setEvents((list) => list.filter((e) => e.id !== id));
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp va usato dentro <AppProvider>');
  return ctx;
}
