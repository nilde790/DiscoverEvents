import type { DatabaseSync } from 'node:sqlite';
import type { OrganizerRequest, RequestStatus } from '@discoverevent/shared/types';

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

/** Query sulle richieste per diventare organizzatore. */
export function createOrganizerRequestsRepository(db: DatabaseSync) {
  return {
    create(userId: number, message: string): number {
      const res = db.prepare('INSERT INTO organizer_requests (user_id, message) VALUES (?, ?)').run(userId, message);
      return Number(res.lastInsertRowid);
    },

    get(id: number): OrganizerRequest | undefined {
      const row = db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(id);
      return row ? toRequest(row as unknown as RequestRow) : undefined;
    },

    /** Ultima richiesta dell'utente (la più recente), se esiste. */
    latestForUser(userId: number): OrganizerRequest | undefined {
      const row = db.prepare(`${REQUEST_SELECT} WHERE r.user_id = ? ORDER BY r.id DESC LIMIT 1`).get(userId);
      return row ? toRequest(row as unknown as RequestRow) : undefined;
    },

    list(status?: RequestStatus): OrganizerRequest[] {
      const rows = status
        ? db.prepare(`${REQUEST_SELECT} WHERE r.status = ? ORDER BY r.created_at`).all(status)
        : db.prepare(`${REQUEST_SELECT} ORDER BY r.created_at DESC`).all();
      return (rows as unknown as RequestRow[]).map(toRequest);
    },

    decide(id: number, status: Exclude<RequestStatus, 'pending'>, adminId: number) {
      db.prepare(
        `UPDATE organizer_requests
         SET status = ?, decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
      ).run(status, adminId, id);
    },
  };
}

export type OrganizerRequestsRepository = ReturnType<typeof createOrganizerRequestsRepository>;
