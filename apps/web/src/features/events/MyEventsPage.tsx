import { Link } from 'react-router';
import { registrationStatus, type EventSummary } from '@discoverevent/shared/types';
import { EventCard } from '@/features/events/components/EventCard';
import { useAuth } from '@/features/auth/AuthContext';
import { useEvents } from '@/features/events/EventsContext';

function Section({ title, events, empty }: { title: string; events: EventSummary[]; empty: string }) {
  return (
    <section className="section">
      <h2>
        {title} <span className="muted">({events.length})</span>
      </h2>
      {events.length ? (
        <div className="grid">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <p className="placeholder">{empty}</p>
      )}
    </section>
  );
}

/** Iscrizioni e preferiti dell'utente corrente. */
export function MyEventsPage() {
  const { currentUser } = useAuth();
  const { events } = useEvents();
  const registered = events.filter((e) => e.isRegistered);
  const upcoming = registered.filter((e) => registrationStatus(e) !== 'closed');
  const past = registered.filter((e) => registrationStatus(e) === 'closed').reverse();
  const favorites = events.filter((e) => e.isFavorite);

  return (
    <div className="page">
      <div className="page-head">
        <h1>I miei eventi</h1>
        <p className="muted">{currentUser?.name}</p>
      </div>
      <Section title="Prossime iscrizioni" events={upcoming} empty="Non sei iscritto a nessun evento in programma." />
      <Section title="Preferiti" events={favorites} empty="Non hai ancora salvato eventi tra i preferiti (★)." />
      {past.length > 0 && <Section title="Eventi a cui hai partecipato" events={past} empty="" />}
      <p>
        <Link to="/catalogo" className="link">
          Scopri altri eventi nel catalogo →
        </Link>
      </p>
    </div>
  );
}
