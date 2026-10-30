import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Clock, MapPin, UserRound } from 'lucide-react';
import type { EventDetail } from '@discoverevent/shared/types';
import { Capacity } from '@/features/events/components/Capacity';
import { EventActions } from '@/features/events/components/EventActions';
import { CategoryBadge, SeatsBadge, StatusBadge } from '@/features/events/components/EventBadges';
import { EventCover } from '@/features/events/components/EventCover';
import { LocationMap } from '@/features/events/components/MapView';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useEvents } from '@/features/events/EventsContext';
import { endOf, formatDate, formatDuration, formatPrice, formatTime } from '@/lib/format';

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
  const price = formatPrice(event.price);

  return (
    <>
      <div className="page event-page">
        <Link to="/catalogo" className="link">
          <ArrowLeft size={16} aria-hidden="true" /> Catalogo
        </Link>
        <EventCover category={event.category} size="hero" />
        <div className="event-layout">
          <section className="event-main">
            <div className="card-top">
              <CategoryBadge event={event} />
              <StatusBadge event={event} />
            </div>
            <h1>{event.title}</h1>

            <ul className="event-facts">
              <li>
                <CalendarDays size={20} aria-hidden="true" />
                <span>
                  <strong>{formatDate(event.start)}</strong>
                  <span className="muted">fino alle {formatTime(end)}</span>
                </span>
              </li>
              <li>
                <Clock size={20} aria-hidden="true" />
                <span>
                  <strong>{formatDuration(event.durationMinutes)}</strong>
                  <span className="muted">Durata</span>
                </span>
              </li>
              <li>
                <MapPin size={20} aria-hidden="true" />
                <span>
                  <strong>{event.venue}</strong>
                  <span className="muted">Luogo</span>
                </span>
              </li>
              <li>
                <UserRound size={20} aria-hidden="true" />
                <span>
                  <strong>{event.organizer.name}</strong>
                  <span className="muted">Organizzatore</span>
                </span>
              </li>
            </ul>

            <div className="section">
              <h2>Descrizione</h2>
              <p className="lead">{event.description}</p>
            </div>

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

          <aside className="event-side">
            <div className="card ticket-box">
              <div className="row-between">
                <span className="ticket-price">{price}</span>
                <SeatsBadge event={event} />
              </div>
              <Capacity event={event} />
              <EventActions event={event} large />
            </div>
            <LocationMap value={event} />
          </aside>
        </div>
      </div>

      {/* Su telefono prezzo e azione principale restano sempre a portata di pollice.
          Fuori da .page, ultima nell'area che scorre: position: sticky la tiene sul fondo, a tutta larghezza. */}
      <div className="event-bar">
        <span className="ticket-price">{price}</span>
        <EventActions event={event} compact large />
      </div>
    </>
  );
}
