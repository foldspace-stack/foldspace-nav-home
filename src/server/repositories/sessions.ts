import { now, randomId, firstOrNull } from '../db';

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  created_at: number;
  revoked_at: number | null;
}

export async function createSession(db: D1Database, userId: string, tokenHash: string, expiresAt: number) {
  const session: SessionRecord = {
    id: randomId(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: now(),
    revoked_at: null,
  };

  await db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    session.id,
    session.user_id,
    session.token_hash,
    session.expires_at,
    session.created_at,
    session.revoked_at,
  ).run();

  return session;
}

export async function getSessionByTokenHash(db: D1Database, tokenHash: string) {
  return firstOrNull<SessionRecord>(
    db.prepare(
      `SELECT id, user_id, token_hash, expires_at, created_at, revoked_at
       FROM sessions
       WHERE token_hash = ?`
    ).bind(tokenHash)
  );
}

export async function revokeSession(db: D1Database, id: string) {
  await db.prepare(
    `UPDATE sessions SET revoked_at = ? WHERE id = ?`
  ).bind(now(), id).run();
}

export async function cleanupExpiredSessions(db: D1Database) {
  await db.prepare(
    `DELETE FROM sessions WHERE expires_at < ? OR revoked_at IS NOT NULL`
  ).bind(now()).run();
}
