import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EventDetail } from '../../shared/types';
import { Capacity, CategoryBadge, EventActions, StatusBadge } from '../components/EventBits';
import { LocationMap } from '../components/MapView';
import { useApp } from '../context/AppContext';
import { endOf, formatDate, formatPrice, formatTime } from '../utils/format';

/** Scheda completa di un evento: data, luogo, descrizione, organizzatore, iscrizioni. */
export function EventPage() {
  const { id } = useParams();
  const { api, events, currentUser } = useApp();
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
  }, [api, id, registeredCount]);

  if (error) return <div className="page"><p className="notice error">{error}</p><Link to="/catalogo">← Torna al catalogo</Link></div>;
  if (!detail) return <div className="page muted">Caricamento…</div>;

  const event = summary ?? detail;
  const isOwner = currentUser?.id === event.organizer.id;
  const end = endOf(event.start, event.durationMinutes);

  return (
    <div className="page event-page">
      <Link to="/catalogo" className="link">← Catalogo</Link>
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
