import type { DatabaseSync } from 'node:sqlite';
import type {
  EventCategory,
  EventDetail,
  EventInput,
  EventSummary,
  OrganizerRequest,
  Participant,
  RequestStatus,
  Role,
  User,
} from '@discoverevent/shared/types';

interface RequestRow {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  message: string;
  status: RequestStatus;
  created_at: string;
  decided_at: string | null;
}

const REQUEST_SELECT = `
  SELECT r.*, u.name AS user_name, u.email AS user_email
  FROM organizer_requests r
  JOIN users u ON u.id = r.user_id`;

const toRequest = (r: RequestRow): OrganizerRequest => ({
  id: r.id,
  user: { id: r.user_id, name: r.user_name, email: r.user_email },
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
  decidedAt: r.decided_at,
});

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

/** Accesso ai dati: tutto l'SQL dell'app sta qui, le rotte non ne vedono. */
export function createRepository(db: DatabaseSync) {
  return {
    // ---------- Utenti ----------

    getUser(id: number): User | undefined {
      return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id) as User | undefined;
    },

    /** Dati necessari al login: l'hash non esce mai da server e repository. */
    getCredentials(email: string): { id: number; passwordHash: string } | undefined {
      return db.prepare('SELECT id, password_hash AS passwordHash FROM users WHERE email = ?').get(email) as
        | { id: number; passwordHash: string }
        | undefined;
    },

    emailExists(email: string): boolean {
      return db.prepare('SELECT 1 FROM users WHERE email = ?').get(email) !== undefined;
    },

    createUser(name: string, email: string, passwordHash: string): number {
      const res = db
        .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
        .run(name, email, passwordHash);
      return Number(res.lastInsertRowid);
    },

    setRole(userId: number, role: Role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    },

    // ---------- Richieste per diventare organizzatore ----------

    createOrganizerRequest(userId: number, message: string): number {
      const res = db.prepare('INSERT INTO organizer_requests (user_id, message) VALUES (?, ?)').run(userId, message);
      return Number(res.lastInsertRowid);
    },

    getOrganizerRequest(id: number): OrganizerRequest | undefined {
      const row = db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(id);
      return row ? toRequest(row as unknown as RequestRow) : undefined;
    },

    /** Ultima richiesta dell'utente (la più recente), se esiste. */
    latestOrganizerRequest(userId: number): OrganizerRequest | undefined {
      const row = db.prepare(`${REQUEST_SELECT} WHERE r.user_id = ? ORDER BY r.id DESC LIMIT 1`).get(userId);
      return row ? toRequest(row as unknown as RequestRow) : undefined;
    },

    listOrganizerRequests(status?: RequestStatus): OrganizerRequest[] {
      const rows = status
        ? db.prepare(`${REQUEST_SELECT} WHERE r.status = ? ORDER BY r.created_at`).all(status)
        : db.prepare(`${REQUEST_SELECT} ORDER BY r.created_at DESC`).all();
      return (rows as unknown as RequestRow[]).map(toRequest);
    },

    decideOrganizerRequest(id: number, status: Exclude<RequestStatus, 'pending'>, adminId: number) {
      db.prepare(
        `UPDATE organizer_requests
         SET status = ?, decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
      ).run(status, adminId, id);
    },

    // ---------- Eventi ----------

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

export type Repository = ReturnType<typeof createRepository>;
