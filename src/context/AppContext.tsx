import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EventInput, EventSummary, OrganizerRequest, User } from '../../shared/types';
import type { LoginInput, RegisterInput } from '../../shared/validation';
import { api, type SessionInfo } from '../api';

interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

interface AppState {
  /** null = visitatore non autenticato. */
  currentUser: User | null;
  /** Ultima richiesta per diventare organizzatore dell'utente corrente, se esiste. */
  organizerRequest: OrganizerRequest | null;
  /** false finché non si sa se c'è una sessione attiva (evita di mostrare "Accedi" per un attimo). */
  authReady: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  requestOrganizer: (message: string) => Promise<void>;
  /** Ricarica utente e richiesta dal server (es. dopo un'approvazione). */
  refreshSession: () => Promise<void>;

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

/** Stato globale: sessione dell'utente, eventi e azioni che li modificano. */
export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo>({ user: null, organizerRequest: null });
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const userId = session.user?.id ?? null;

  const notify = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now();
    setToast({ id, text, kind });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  }, []);

  const refreshSession = useCallback(async () => {
    setSession(await api.me());
  }, []);

  // All'avvio: c'è già una sessione (cookie) attiva?
  useEffect(() => {
    refreshSession()
      .catch((e: Error) => setError(e.message))
      .finally(() => setAuthReady(true));
  }, [refreshSession]);

  // Eventi: ricaricati quando cambia utente, perché preferiti e iscrizioni dipendono da chi guarda.
  useEffect(() => {
    if (!authReady) return;
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
  }, [authReady, userId]);

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
    currentUser: session.user,
    organizerRequest: session.organizerRequest,
    authReady,
    // Login e registrazione lanciano gli errori al form, che li mostra sotto i campi.
    login: async (input) => {
      const info = await api.login(input);
      setSession(info);
      notify(`Ciao, ${info.user?.name}!`);
    },
    register: async (input) => {
      const info = await api.register(input);
      setSession(info);
      notify(info.organizerRequest ? 'Account creato: la richiesta da organizzatore è in attesa' : 'Account creato!');
    },
    logout: async () => {
      await run(() => api.logout(), 'Sei uscito dal tuo account');
      setSession({ user: null, organizerRequest: null });
    },
    requestOrganizer: async (message) => {
      const request = await run(() => api.requestOrganizer(message), 'Richiesta inviata');
      setSession((s) => ({ ...s, organizerRequest: request }));
    },
    refreshSession,

    events,
    loading,
    error,
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

    toast,
    notify,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp va usato dentro <AppProvider>');
  return ctx;
}
