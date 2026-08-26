-- Registration (POST /api/auth/register) keys new accounts by email, and
-- login accepts email as an identity. Enforce uniqueness case-insensitively,
-- skipping the empty string so users without an email are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (lower(email))
  WHERE email <> '';
