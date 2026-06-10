-- Current dev snapshot for foldspace-nav-home
-- Source:
-- - default categories from the app
-- - current config from browser localStorage on the dev site
--
-- Notes:
-- - No users, sessions, or sites were present in the current dev database snapshot.
-- - Import this into a Cloudflare D1 database that already has the schema applied.
-- - After import, open the site and use /api/auth/bootstrap to create the first admin user.

BEGIN TRANSACTION;

INSERT OR REPLACE INTO categories
  (id, name, icon, parent_id, is_subcategory, weight, access_password_hash, created_at, updated_at)
VALUES
  ('common', '常用推荐', 'Star', NULL, 0, -1000, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('tools', '工具', 'Folder', NULL, 0, 0, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('life', '生活工具', 'Target', 'tools', 1, 0, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('network', '网络工具', 'Wifi', 'tools', 1, 0, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);

INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES
  ('config', '{"view":{"mode":"detailed","defaultMode":"detailed"},"ui":{"showPinnedWebsites":true},"ai":{"provider":"google","apiKey":"","baseUrl":"https://generativelanguage.googleapis.com","model":"gemini-3.1-flash-lite","websiteTitle":"","navigationName":"","faviconUrl":"","providers":{"google":{"apiKey":"","baseUrl":"https://generativelanguage.googleapis.com","model":"gemini-3.1-flash-lite"},"openai":{"apiKey":"","baseUrl":"https://api.openai.com/v1","model":"gpt-5-nano"},"claude":{"apiKey":"","baseUrl":"https://api.anthropic.com","model":"claude-haiku-4-5"}}},"website":{"passwordExpiry":{"value":1,"unit":"week"}},"ticker":{"enabled":false,"source":"mastodon","customItems":[]},"weather":{"enabled":false,"provider":"jinrishici","unit":"celsius"}}', CAST(strftime('%s','now') AS INTEGER) * 1000);

COMMIT;
