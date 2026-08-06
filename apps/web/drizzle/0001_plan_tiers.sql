-- Migrate legacy plan tiers to Free / Pro / Enterprise
ALTER TYPE "public"."plan" ADD VALUE IF NOT EXISTS 'enterprise';

UPDATE "users" SET "plan" = 'pro' WHERE "plan"::text = 'starter';
UPDATE "users" SET "plan" = 'enterprise' WHERE "plan"::text = 'business';
UPDATE "payment_requests" SET "plan" = 'pro' WHERE "plan"::text = 'starter';
UPDATE "payment_requests" SET "plan" = 'enterprise' WHERE "plan"::text = 'business';
