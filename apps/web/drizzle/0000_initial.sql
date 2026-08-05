-- HostingIt initial schema migration
-- Run with: npm run db:push (recommended) or apply manually

CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'pro', 'business');
CREATE TYPE "public"."account_status" AS ENUM('pending', 'active', 'suspended');
CREATE TYPE "public"."app_status" AS ENUM('creating', 'deploying', 'running', 'stopped', 'error');
CREATE TYPE "public"."payment_method" AS ENUM('upi', 'paypal', 'bank');
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE "public"."deployment_status" AS ENUM('pending', 'running', 'success', 'failed');
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text,
  "name" text,
  "email_verified" boolean DEFAULT false NOT NULL,
  "plan" "plan" DEFAULT 'free' NOT NULL,
  "account_status" "account_status" DEFAULT 'active' NOT NULL,
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "dokploy_project_id" text,
  "dokploy_environment_id" text,
  "github_id" text,
  "github_access_token" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "apps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "dokploy_project_id" text NOT NULL,
  "dokploy_app_id" text NOT NULL,
  "dokploy_domain_id" text,
  "github_owner" text NOT NULL,
  "github_repo" text NOT NULL,
  "github_branch" text DEFAULT 'main' NOT NULL,
  "subdomain" text NOT NULL,
  "custom_domain" text,
  "status" "app_status" DEFAULT 'creating' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "payment_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "plan" "plan" NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "method" "payment_method" NOT NULL,
  "reference_note" text NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "admin_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deployments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" uuid NOT NULL REFERENCES "apps"("id") ON DELETE cascade,
  "dokploy_deployment_id" text,
  "status" "deployment_status" DEFAULT 'pending' NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp
);

CREATE TABLE "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_token" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "expires" timestamp NOT NULL
);
