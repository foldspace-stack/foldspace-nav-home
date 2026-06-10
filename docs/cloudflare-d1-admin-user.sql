-- Exported from the current local dev D1 snapshot.
-- This inserts the existing admin user record as-is.
-- If you import this into Cloudflare D1, the password will remain valid
-- because the hash is preserved exactly.

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
  'pbkdf2$120000$ABQQqYG/PYfA84H3SYK4NA==$yjIIK3tp/72PrT9mqVSnL/ggz3Wy+ltviG2L8EwGyDI=',
  'admin',
  'active',
  1780969980749,
  1780988385872,
  1780988385872
);

COMMIT;
