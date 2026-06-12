import { now, randomId, firstOrNull, allResults } from '../db';

export interface UserRecord {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'disabled';
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
}

export interface UserInput {
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'admin' | 'editor' | 'user';
  status?: 'active' | 'disabled';
}

export function toUserItem(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}

export async function listUsers(db: D1Database) {
  const rows = await allResults<UserRecord>(
    db.prepare(
      `SELECT id, username, display_name, password_hash, role, status, created_at, updated_at, last_login_at
       FROM users
       ORDER BY created_at ASC`
    )
  );
  return rows.map(toUserItem);
}

export async function getUserById(db: D1Database, id: string) {
  const row = await firstOrNull<UserRecord>(
    db.prepare(
      `SELECT id, username, display_name, password_hash, role, status, created_at, updated_at, last_login_at
       FROM users
       WHERE id = ?`
    ).bind(id)
  );
  return row ? toUserItem(row) : null;
}

export async function getUserRecordById(db: D1Database, id: string) {
  return firstOrNull<UserRecord>(
    db.prepare(
      `SELECT id, username, display_name, password_hash, role, status, created_at, updated_at, last_login_at
       FROM users
       WHERE id = ?`
    ).bind(id)
  );
}

export async function getUserByUsername(db: D1Database, username: string) {
  return firstOrNull<UserRecord>(
    db.prepare(
      `SELECT id, username, display_name, password_hash, role, status, created_at, updated_at, last_login_at
       FROM users
       WHERE username = ?`
    ).bind(username)
  );
}

export async function countUsers(db: D1Database) {
  const row = await firstOrNull<{ count: number }>(
    db.prepare(`SELECT COUNT(*) as count FROM users`)
  );
  return row?.count ?? 0;
}

export async function createUser(db: D1Database, input: UserInput) {
  const timestamp = now();
  const user: UserRecord = {
    id: randomId(),
    username: input.username,
    display_name: input.displayName,
    password_hash: input.passwordHash,
    role: input.role,
    status: input.status ?? 'active',
    created_at: timestamp,
    updated_at: timestamp,
    last_login_at: null,
  };

  await db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, role, status, created_at, updated_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    user.id,
    user.username,
    user.display_name,
    user.password_hash,
    user.role,
    user.status,
    user.created_at,
    user.updated_at,
    user.last_login_at,
  ).run();

  return toUserItem(user);
}

export async function updateUserStatus(db: D1Database, id: string, status: 'active' | 'disabled') {
  const timestamp = now();
  await db.prepare(
    `UPDATE users SET status = ?, updated_at = ? WHERE id = ?`
  ).bind(status, timestamp, id).run();
}

export async function updateUserPassword(db: D1Database, id: string, passwordHash: string) {
  const timestamp = now();
  await db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`
  ).bind(passwordHash, timestamp, id).run();
}

export async function updateUserUsername(db: D1Database, id: string, username: string, displayName?: string) {
  const timestamp = now();
  await db.prepare(
    `UPDATE users SET username = ?, display_name = ?, updated_at = ? WHERE id = ?`
  ).bind(username, displayName ?? username, timestamp, id).run();
}

export async function updateUserProfile(
  db: D1Database,
  id: string,
  input: { username?: string; displayName?: string }
) {
  const timestamp = now();
  const updates: string[] = [];
  const bindings: Array<string | number> = [];

  if (input.username !== undefined) {
    updates.push('username = ?');
    bindings.push(input.username);
  }
  if (input.displayName !== undefined) {
    updates.push('display_name = ?');
    bindings.push(input.displayName);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  bindings.push(timestamp, id);

  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();
}

export async function updateUserRole(db: D1Database, id: string, role: 'admin' | 'editor' | 'user') {
  const timestamp = now();
  await db.prepare(
    `UPDATE users SET role = ?, updated_at = ? WHERE id = ?`
  ).bind(role, timestamp, id).run();
}

export async function setLastLoginAt(db: D1Database, id: string) {
  const timestamp = now();
  await db.prepare(
    `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`
  ).bind(timestamp, timestamp, id).run();
}
