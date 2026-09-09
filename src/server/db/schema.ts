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

export const jwks = pgTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  alg: text("alg"),
  crv: text("crv"),
});

export const oauthClient = pgTable("oauth_client", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  clientDiscoveryId: text("client_discovery_id"),
  disabled: boolean("disabled").default(false),
  skipConsent: boolean("skip_consent"),
  enableEndSession: boolean("enable_end_session"),
  subjectType: text("subject_type"),
  scopes: text("scopes").array(),
  clientCredentialsScopes: text("client_credentials_scopes").array().default([]),
  userId: text("user_id").references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  name: text("name"),
  uri: text("uri"),
  icon: text("icon"),
  contacts: text("contacts").array(),
  tos: text("tos"),
  policy: text("policy"),
  softwareId: text("software_id"),
  softwareVersion: text("software_version"),
  softwareStatement: text("software_statement"),
  redirectUris: text("redirect_uris").array().notNull(),
  postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
  backchannelLogoutUri: text("backchannel_logout_uri"),
  backchannelLogoutSessionRequired: boolean("backchannel_logout_session_required"),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
  applicationType: text("application_type"),
  jwks: text("jwks"),
  jwksUri: text("jwks_uri"),
  grantTypes: text("grant_types").array(),
  responseTypes: text("response_types").array(),
  requirePKCE: boolean("require_pkce"),
  dpopBoundAccessTokens: boolean("dpop_bound_access_tokens").default(false),
  referenceId: text("reference_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
}, (table) => [index("oauth_client_user_idx").on(table.userId)]);

export const oauthResource = pgTable("oauth_resource", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  name: text("name").notNull(),
  accessTokenTtl: integer("access_token_ttl"),
  refreshTokenTtl: integer("refresh_token_ttl"),
  signingAlgorithm: text("signing_algorithm"),
  signingKeyId: text("signing_key_id"),
  allowedScopes: text("allowed_scopes").array(),
  customClaims: jsonb("custom_claims").$type<Record<string, unknown>>(),
  dpopBoundAccessTokensRequired: boolean("dpop_bound_access_tokens_required").default(false),
  disabled: boolean("disabled").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  policyVersion: integer("policy_version").default(1),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

export const oauthClientResource = pgTable("oauth_client_resource", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  resourceId: text("resource_id").notNull().references(() => oauthResource.identifier, { onDelete: "cascade" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (table) => [
  index("oauth_client_resource_client_idx").on(table.clientId),
  index("oauth_client_resource_resource_idx").on(table.resourceId),
  uniqueIndex("oauth_client_resource_unique").on(table.clientId, table.resourceId),
]);

export const oauthRefreshToken = pgTable("oauth_refresh_token", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId),
  sessionId: text("session_id").references(() => session.id, { onDelete: "set null" }),
  userId: text("user_id").notNull().references(() => user.id),
  referenceId: text("reference_id"),
  authorizationCodeId: text("authorization_code_id"),
  resources: text("resources").array(),
  requestedUserInfoClaims: text("requested_user_info_claims").array(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  revoked: timestamp("revoked", { withTimezone: true }),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  rotationReplayResponse: text("rotation_replay_response"),
  rotationReplayExpiresAt: timestamp("rotation_replay_expires_at", { withTimezone: true }),
  authTime: timestamp("auth_time", { withTimezone: true }),
  confirmation: jsonb("confirmation").$type<Record<string, unknown>>(),
  scopes: text("scopes").array().notNull(),
}, (table) => [
  index("oauth_refresh_client_idx").on(table.clientId),
  index("oauth_refresh_session_idx").on(table.sessionId),
  index("oauth_refresh_user_idx").on(table.userId),
  index("oauth_refresh_code_idx").on(table.authorizationCodeId),
]);

export const oauthAccessToken = pgTable("oauth_access_token", {
  id: text("id").primaryKey(),
  token: text("token").unique(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId),
  sessionId: text("session_id").references(() => session.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => user.id),
  referenceId: text("reference_id"),
  authorizationCodeId: text("authorization_code_id"),
  resources: text("resources").array(),
  requestedUserInfoClaims: text("requested_user_info_claims").array(),
  refreshId: text("refresh_id").references(() => oauthRefreshToken.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  revoked: timestamp("revoked", { withTimezone: true }),
  confirmation: jsonb("confirmation").$type<Record<string, unknown>>(),
  scopes: text("scopes").array().notNull(),
}, (table) => [
  index("oauth_access_client_idx").on(table.clientId),
  index("oauth_access_session_idx").on(table.sessionId),
  index("oauth_access_user_idx").on(table.userId),
  index("oauth_access_code_idx").on(table.authorizationCodeId),
  index("oauth_access_refresh_idx").on(table.refreshId),
]);

export const oauthConsent = pgTable("oauth_consent", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId),
  userId: text("user_id").references(() => user.id),
  referenceId: text("reference_id"),
  resources: text("resources").array(),
  requestedUserInfoClaims: text("requested_user_info_claims").array(),
  scopes: text("scopes").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [index("oauth_consent_client_idx").on(table.clientId), index("oauth_consent_user_idx").on(table.userId)]);

export const oauthClientAssertion = pgTable("oauth_client_assertion", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

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
export const ingestionMode = pgEnum("ingestion_mode", ["build", "expand"]);
export const ingestionStatus = pgEnum("ingestion_status", ["received", "processing", "awaiting_review", "completed", "failed"]);
export const aiJobStatus = pgEnum("ai_job_status", ["queued", "running", "awaiting_review", "committing", "committed", "failed", "cancelled"]);

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

export const ingestions = pgTable(
  "ingestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vaultId: uuid("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    mode: ingestionMode("mode").notNull(),
    inputType: text("input_type").notNull().default("text"),
    sourceName: text("source_name").notNull(),
    contentHash: text("content_hash").notNull(),
    rawText: text("raw_text").notNull(),
    status: ingestionStatus("status").notNull().default("received"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("ingestions_idempotency_unique").on(table.vaultId, table.contentHash, table.mode),
    index("ingestions_user_vault_idx").on(table.userId, table.vaultId),
  ],
);

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ingestionId: uuid("ingestion_id").notNull().references(() => ingestions.id, { onDelete: "cascade" }),
    status: aiJobStatus("status").notNull().default("queued"),
    stage: text("stage").notNull().default("received"),
    progress: integer("progress").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    provider: text("provider").notNull(),
    model: text("model"),
    errorCode: text("error_code"),
    errorMessageSafe: text("error_message_safe"),
    resultJson: jsonb("result_json").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("ai_jobs_ingestion_unique").on(table.ingestionId),
    index("ai_jobs_status_idx").on(table.status, table.stage),
  ],
);

export const authSchema = {
  user,
  session,
  account,
  verification,
  jwks,
  oauthClient,
  oauthResource,
  oauthClientResource,
  oauthRefreshToken,
  oauthAccessToken,
  oauthConsent,
  oauthClientAssertion,
};
