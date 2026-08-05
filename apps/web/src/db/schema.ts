import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  pgEnum,
  decimal,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const planEnum = pgEnum("plan", ["free", "starter", "pro", "business"]);
export const accountStatusEnum = pgEnum("account_status", [
  "pending",
  "active",
  "suspended",
]);
export const appStatusEnum = pgEnum("app_status", [
  "creating",
  "deploying",
  "running",
  "stopped",
  "error",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "upi",
  "paypal",
  "bank",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
]);
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "running",
  "success",
  "failed",
]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  plan: planEnum("plan").default("free").notNull(),
  accountStatus: accountStatusEnum("account_status").default("active").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  dokployProjectId: text("dokploy_project_id"),
  dokployEnvironmentId: text("dokploy_environment_id"),
  githubId: text("github_id"),
  githubAccessToken: text("github_access_token"),
  googleId: text("google_id"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apps = pgTable("apps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  dokployProjectId: text("dokploy_project_id").notNull(),
  dokployAppId: text("dokploy_app_id").notNull(),
  dokployDomainId: text("dokploy_domain_id"),
  githubOwner: text("github_owner").notNull(),
  githubRepo: text("github_repo").notNull(),
  githubBranch: text("github_branch").default("main").notNull(),
  subdomain: text("subdomain").notNull(),
  customDomain: text("custom_domain"),
  status: appStatusEnum("status").default("creating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  referenceNote: text("reference_note").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deployments = pgTable("deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  dokployDeploymentId: text("dokploy_deployment_id"),
  status: deploymentStatusEnum("status").default("pending").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  apps: many(apps),
  paymentRequests: many(paymentRequests),
  verificationTokens: many(verificationTokens),
}));

export const appsRelations = relations(apps, ({ one, many }) => ({
  user: one(users, { fields: [apps.userId], references: [users.id] }),
  deployments: many(deployments),
}));

export const paymentRequestsRelations = relations(paymentRequests, ({ one }) => ({
  user: one(users, {
    fields: [paymentRequests.userId],
    references: [users.id],
  }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  app: one(apps, { fields: [deployments.appId], references: [apps.id] }),
}));

export type User = typeof users.$inferSelect;
export type App = typeof apps.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
