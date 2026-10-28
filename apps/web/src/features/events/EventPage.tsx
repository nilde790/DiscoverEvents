import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type { EventDetail } from '@discoverevent/shared/types';
import { Capacity } from '@/features/events/components/Capacity';
import { EventActions } from '@/features/events/components/EventActions';
import { CategoryBadge, StatusBadge } from '@/features/events/components/EventBadges';
import { LocationMap } from '@/features/events/components/MapView';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useEvents } from '@/features/events/EventsContext';
import { endOf, formatDate, formatPrice, formatTime } from '@/lib/format';

/** Scheda completa di un evento: data, luogo, descrizione, organizzatore, iscrizioni. */
export function EventPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { events } = useEvents();
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Il riepilogo nello stato globale si aggiorna subito (preferiti, iscrizioni);
  // il dettaglio dal server serve per la lista iscritti, visibile solo all'organizzatore.
  const summary = events.find((e) => e.id === Number(id));
  const registeredCount = summary?.registeredCount;

  useEffect(() => {
    let cancelled = false;
    api
      .event(Number(id))
      .then((d) => !cancelled && (setDetail(d), setError(null)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // Si ricarica anche quando cambia utente: la lista iscritti dipende da chi guarda.
  }, [id, registeredCount, currentUser?.id]);

  if (error)
    return (
      <div className="page">
        <p className="notice error">{error}</p>
        <Link to="/catalogo" className="link">
          <ArrowLeft size={16} aria-hidden="true" /> Torna al catalogo
        </Link>
      </div>
    );
  if (!detail) return <div className="page muted">Caricamento…</div>;

  const event = summary ?? detail;
  const isOwner = currentUser?.id === event.organizer.id;
  const end = endOf(event.start, event.durationMinutes);

  return (
    <div className="page event-page">
      <Link to="/catalogo" className="link">
        <ArrowLeft size={16} aria-hidden="true" /> Catalogo
      </Link>
      <div className="event-layout">
        <section>
          <div className="card-top">
            <CategoryBadge event={event} />
            <StatusBadge event={event} />
          </div>
          <h1>{event.title}</h1>
          <p className="lead">{event.description}</p>

          <dl className="facts big">
            <dt>Quando</dt>
            <dd>
              {formatDate(event.start)} – {formatTime(end)}
            </dd>
            <dt>Dove</dt>
            <dd>{event.venue}</dd>
            <dt>Organizzatore</dt>
            <dd>{event.organizer.name}</dd>
            <dt>Prezzo</dt>
            <dd>{formatPrice(event.price)}</dd>
          </dl>

          <Capacity event={event} />
          <EventActions event={event} />

          {isOwner && (
            <section className="owner-box">
              <div className="row-between">
                <h2>Iscritti ({detail.participants?.length ?? 0})</h2>
                <Link to={`/organizzatore/eventi/${event.id}/modifica`} className="btn btn-secondary">
                  Modifica evento
                </Link>
              </div>
              {detail.participants?.length ? (
                <ol className="participants">
                  {detail.participants.map((p) => (
                    <li key={p.id}>
                      {p.name} <span className="muted">· iscritto {formatDate(p.registeredAt)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">Ancora nessun iscritto.</p>
              )}
            </section>
          )}
        </section>
        <LocationMap value={event} />
      </div>
    </div>
  );
}
