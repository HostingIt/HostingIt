-- Terms and Privacy acceptance recorded at signup or when re-accepted
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_version" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_version" text;
