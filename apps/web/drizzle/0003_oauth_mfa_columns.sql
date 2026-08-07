-- OAuth + MFA columns missing from 0000_initial.sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean NOT NULL DEFAULT false;
