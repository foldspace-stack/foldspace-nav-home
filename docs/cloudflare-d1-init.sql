-- Cloudflare D1 initial setup for foldspace-nav-home
-- Usage:
-- 1. Open Cloudflare Dashboard -> D1 -> your database -> SQL Console
-- 2. Paste this file and run it
-- 3. Then open the app and use /api/auth/bootstrap to create the first admin user

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  parent_id TEXT,
  is_subcategory INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0,
  access_password_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  pinned INTEGER NOT NULL DEFAULT 0,
  pinned_order INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_category_sort ON sites(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- Default categories used by the app when the database is empty.
-- You can keep only "common" if you want a minimal first run.
INSERT OR IGNORE INTO categories
  (id, name, icon, parent_id, is_subcategory, weight, access_password_hash, created_at, updated_at)
VALUES
  ('common', '常用推荐', 'Star', NULL, 0, -1000, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('tools', '工具', 'Folder', NULL, 0, 0, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('life', '生活工具', 'Target', 'tools', 1, 0, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('network', '网络工具', 'Wifi', 'tools', 1, 0, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);

COMMIT;

-- Notes:
-- - The first admin user is not seeded here.
-- - After running this file, open the site and use the bootstrap flow to create the initial admin account.
