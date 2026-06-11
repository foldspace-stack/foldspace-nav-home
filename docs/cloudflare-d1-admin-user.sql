-- Exported from the current local dev D1 snapshot.
-- This inserts the existing admin user record as-is.
-- If you import this into Cloudflare D1, the password will remain valid
-- because the hash is preserved exactly.
-- This version uses 100000 PBKDF2 iterations, which is compatible with Cloudflare Workers.

BEGIN TRANSACTION;

INSERT OR REPLACE INTO users (
  id,
  username,
  display_name,
  password_hash,
  role,
  status,
  created_at,
  updated_at,
  last_login_at
) VALUES (
  '24ec0e2e-40ff-4878-b500-607e56cc964a',
  'admin',
  'admin',
  'pbkdf2$100000$3sj7oCi5pQ7RJFXhIRCwmw==$s++njsqeA7+lHj8JtWksyFmY/BkW312MRhruAzwLH+s=',
  'admin',
  'active',
  1780969980749,
  1780988385872,
  1780988385872
);

COMMIT;
