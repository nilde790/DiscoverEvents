import type { DatabaseSync } from 'node:sqlite';
import type { EventCategory, EventDetail, EventInput, EventSummary, Participant } from '@discoverevent/shared/types';

/** Riga restituita dalla query degli eventi (nomi colonna in stile SQL). */
interface EventRow {
  id: number;
  title: string;
  category: EventCategory;
  description: string;
  venue: string;
  lat: number;
  lng: number;
  start: string;
  duration_minutes: number;
  price: number;
  capacity: number;
  organizer_id: number;
  organizer_name: string;
  registered_count: number;
  is_favorite: number;
  is_registered: number;
}

const EVENT_SELECT = `
  SELECT e.*, u.name AS organizer_name,
    (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registered_count,
    EXISTS (SELECT 1 FROM favorites f     WHERE f.event_id = e.id AND f.user_id = $userId) AS is_favorite,
    EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.user_id = $userId) AS is_registered
  FROM events e
  JOIN users u ON u.id = e.organizer_id`;

const toSummary = (r: EventRow): EventSummary => ({
  id: r.id,
  title: r.title,
  category: r.category,
  description: r.description,
  venue: r.venue,
  lat: r.lat,
  lng: r.lng,
  start: r.start,
  durationMinutes: r.duration_minutes,
  price: r.price,
  capacity: r.capacity,
  organizer: { id: r.organizer_id, name: r.organizer_name },
  registeredCount: r.registered_count,
  isFavorite: r.is_favorite === 1,
  isRegistered: r.is_registered === 1,
});

/** Query su eventi, iscrizioni e preferiti. */
export function createEventsRepository(db: DatabaseSync) {
  return {
    listEvents(userId: number): EventSummary[] {
      const rows = db.prepare(`${EVENT_SELECT} ORDER BY e.start`).all({ $userId: userId });
      return (rows as unknown as EventRow[]).map(toSummary);
    },

    getEvent(id: number, userId: number): EventSummary | undefined {
      const row = db.prepare(`${EVENT_SELECT} WHERE e.id = $id`).get({ $id: id, $userId: userId });
      return row ? toSummary(row as unknown as EventRow) : undefined;
    },

    getEventDetail(id: number, userId: number): EventDetail | undefined {
      const event = this.getEvent(id, userId);
      if (!event) return undefined;
      if (event.organizer.id !== userId) return event;
      const participants = db
        .prepare(
          `SELECT u.id, u.name, r.created_at AS registeredAt
           FROM registrations r JOIN users u ON u.id = r.user_id
           WHERE r.event_id = ? ORDER BY r.created_at`,
        )
        .all(id) as unknown as Participant[];
      return { ...event, participants };
    },

    createEvent(input: EventInput, organizerId: number): number {
      const res = db
        .prepare(
          `INSERT INTO events (title, category, description, venue, lat, lng, start, duration_minutes, price, capacity, organizer_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(input.title, input.category, input.description, input.venue, input.lat, input.lng,
          input.start, input.durationMinutes, input.price, input.capacity, organizerId);
      return Number(res.lastInsertRowid);
    },

    updateEvent(id: number, input: EventInput) {
      db.prepare(
        `UPDATE events SET title = ?, category = ?, description = ?, venue = ?, lat = ?, lng = ?,
           start = ?, duration_minutes = ?, price = ?, capacity = ?
         WHERE id = ?`,
      ).run(input.title, input.category, input.description, input.venue, input.lat, input.lng,
        input.start, input.durationMinutes, input.price, input.capacity, id);
    },

    deleteEvent(id: number) {
      db.prepare('DELETE FROM events WHERE id = ?').run(id);
    },

    addRegistration(userId: number, eventId: number) {
      db.prepare('INSERT INTO registrations (user_id, event_id) VALUES (?, ?)').run(userId, eventId);
    },

    removeRegistration(userId: number, eventId: number) {
      db.prepare('DELETE FROM registrations WHERE user_id = ? AND event_id = ?').run(userId, eventId);
    },

    setFavorite(userId: number, eventId: number, favorite: boolean) {
      if (favorite) db.prepare('INSERT OR IGNORE INTO favorites (user_id, event_id) VALUES (?, ?)').run(userId, eventId);
      else db.prepare('DELETE FROM favorites WHERE user_id = ? AND event_id = ?').run(userId, eventId);
    },
  };
}

export type EventsRepository = ReturnType<typeof createEventsRepository>;
