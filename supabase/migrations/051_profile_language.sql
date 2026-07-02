-- 051_profile_language.sql
-- Spanish (es-419) language support: the durable, cross-device language
-- preference. The nutrisync_locale cookie mirrors it per device; login syncs
-- profile → cookie, signup syncs cookie → profile. Idempotent.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_language_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('en', 'es'));
