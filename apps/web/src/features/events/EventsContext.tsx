import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EventInput, EventSummary } from '@discoverevent/shared/types';
import { errorMessage, useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';

interface EventsState {
  events: EventSummary[];
  loading: boolean;
  error: string | null;
  toggleFavorite: (e: EventSummary) => Promise<void>;
  toggleRegistration: (e: EventSummary) => Promise<void>;
  saveEvent: (input: EventInput, id?: number) => Promise<EventSummary>;
  deleteEvent: (id: number) => Promise<void>;
}

const EventsContext = createContext<EventsState | null>(null);

/** Elenco degli eventi e azioni che lo modificano (preferiti, iscrizioni, gestione). */
export function EventsProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const { currentUser, authReady } = useAuth();
  const userId = currentUser?.id ?? null;

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ricaricati quando cambia utente, perché preferiti e iscrizioni dipendono da chi guarda.
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

  /** Esegue un'azione mostrando il messaggio di successo o l'errore. */
  const run = useCallback(
    async <T,>(action: () => Promise<T>, success?: string): Promise<T> => {
      try {
        const result = await action();
        if (success) notify(success);
        return result;
      } catch (e) {
        notify(errorMessage(e), 'error');
        throw e;
      }
    },
    [notify],
  );

  const value: EventsState = {
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
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsState {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents va usato dentro <EventsProvider>');
  return ctx;
}
