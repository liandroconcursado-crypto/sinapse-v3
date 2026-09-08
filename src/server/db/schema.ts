import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    ...timestamps,
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("session_token_unique").on(table.token), index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const vaults = pgTable(
  "vaults",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Meu cérebro"),
    ...timestamps,
  },
  (table) => [index("vaults_user_idx").on(table.userId), uniqueIndex("vaults_user_name_unique").on(table.userId, table.name)],
);

export const vaultNotes = pgTable(
  "vault_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vaultId: uuid("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    contentMarkdown: text("content_markdown").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vault_notes_path_unique").on(table.vaultId, table.path),
    index("vault_notes_user_vault_idx").on(table.userId, table.vaultId),
    index("vault_notes_title_idx").on(table.vaultId, table.normalizedTitle),
  ],
);

export const linkKind = pgEnum("link_kind", ["wikilink", "suggested", "confirmed"]);

export const vaultLinks = pgTable(
  "vault_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vaultId: uuid("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    sourceNoteId: uuid("source_note_id").notNull().references(() => vaultNotes.id, { onDelete: "cascade" }),
    targetNoteId: uuid("target_note_id").references(() => vaultNotes.id, { onDelete: "set null" }),
    targetText: text("target_text").notNull(),
    targetNormalized: text("target_normalized").notNull(),
    alias: text("alias"),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    kind: linkKind("kind").notNull().default("wikilink"),
    ...timestamps,
  },
  (table) => [
    index("vault_links_source_idx").on(table.sourceNoteId),
    index("vault_links_target_idx").on(table.targetNoteId),
    index("vault_links_resolve_idx").on(table.vaultId, table.targetNormalized),
  ],
);

export const authSchema = { user, session, account, verification };
