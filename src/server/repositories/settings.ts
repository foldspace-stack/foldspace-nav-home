import { now, firstOrNull, allResults } from '../db';

export interface SettingRecord {
  key: string;
  value: string;
  updated_at: number;
}

export async function getSetting(db: D1Database, key: string) {
  const row = await firstOrNull<SettingRecord>(
    db.prepare(`SELECT key, value, updated_at FROM settings WHERE key = ?`).bind(key)
  );
  return row ?? null;
}

export async function setSetting(db: D1Database, key: string, value: unknown) {
  const payload = typeof value === 'string' ? value : JSON.stringify(value);
  const timestamp = now();
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(key, payload, timestamp).run();
  return { key, value: payload, updatedAt: timestamp };
}

export async function listSettings(db: D1Database) {
  return allResults<SettingRecord>(
    db.prepare(`SELECT key, value, updated_at FROM settings ORDER BY key ASC`)
  );
}

export async function getSettingsMap(db: D1Database) {
  const rows = await listSettings(db);
  return rows.reduce<Record<string, unknown>>((acc, row) => {
    try {
      acc[row.key] = JSON.parse(row.value);
    } catch {
      acc[row.key] = row.value;
    }
    return acc;
  }, {});
}
