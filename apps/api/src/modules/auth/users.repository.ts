import type { DatabaseSync } from 'node:sqlite';
import type { Role, User } from '@discoverevent/shared/types';

/** Query sugli account. L'hash della password esce da qui solo verso il login. */
export function createUsersRepository(db: DatabaseSync) {
  return {
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
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
