
-- GENERATED_EXTENSIONS_BEGIN 9aefe61c5d99
-- 以下は schema.prisma の注釈から自動生成されています (extensions)
-- kind: raw
CREATE EXTENSION IF NOT EXISTS citext;

-- kind: raw
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- GENERATED_EXTENSIONS_END 9aefe61c5d99

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255),
    "email" CITEXT,
    "email_verified" TIMESTAMPTZ(6),
    "image" VARCHAR(2048),
    "hashed_password" VARCHAR(255),
    "region" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vods" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vod_aliases" (
    "id" SERIAL NOT NULL,
    "vod_id" INTEGER NOT NULL,
    "alias" CITEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vod_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clips" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "vod_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" TEXT NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "start_ms" INTEGER NOT NULL,
    "end_ms" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "epnum" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_vods" (
    "user_id" BIGINT NOT NULL,
    "vod_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_vods_pkey" PRIMARY KEY ("user_id","vod_id")
);

-- CreateTable
CREATE TABLE "clips_playlists" (
    "clip_id" BIGINT NOT NULL,
    "playlist_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "clips_playlists_pkey" PRIMARY KEY ("clip_id","playlist_id")
);

-- CreateTable
CREATE TABLE "playlists_vods" (
    "playlist_id" BIGINT NOT NULL,
    "vod_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlists_vods_pkey" PRIMARY KEY ("playlist_id","vod_id")
);

-- CreateTable
CREATE TABLE "favorite_clips" (
    "user_id" BIGINT NOT NULL,
    "clip_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_clips_pkey" PRIMARY KEY ("user_id","clip_id")
);

-- CreateTable
CREATE TABLE "favorite_playlists" (
    "user_id" BIGINT NOT NULL,
    "playlist_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_playlists_pkey" PRIMARY KEY ("user_id","playlist_id")
);

-- CreateTable
CREATE TABLE "linked_extensions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "extension_instance_id" UUID NOT NULL,
    "extension_auth_hash" VARCHAR(64) NOT NULL,
    "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "linked_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_link_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_receipts" (
    "id" BIGSERIAL NOT NULL,
    "linked_extension_id" BIGINT NOT NULL,
    "client_item_id" UUID NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE INDEX "vod_aliases_vod_id_idx" ON "vod_aliases"("vod_id");

-- CreateIndex
CREATE UNIQUE INDEX "vod_aliases_alias_key" ON "vod_aliases"("alias");

-- CreateIndex
CREATE INDEX "users_vods_vod_id_idx" ON "users_vods"("vod_id");

-- CreateIndex
CREATE INDEX "clips_playlists_playlist_id_created_at_idx" ON "clips_playlists"("playlist_id", "created_at");

-- CreateIndex
CREATE INDEX "playlists_vods_vod_id_idx" ON "playlists_vods"("vod_id");

-- CreateIndex
CREATE INDEX "playlists_vods_playlist_id_created_at_idx" ON "playlists_vods"("playlist_id", "created_at");

-- CreateIndex
CREATE INDEX "favorite_clips_user_id_created_at_idx" ON "favorite_clips"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "favorite_clips_clip_id_idx" ON "favorite_clips"("clip_id");

-- CreateIndex
CREATE INDEX "favorite_playlists_user_id_created_at_idx" ON "favorite_playlists"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "favorite_playlists_playlist_id_idx" ON "favorite_playlists"("playlist_id");

-- CreateIndex
CREATE INDEX "extension_link_tokens_user_id_expires_at_idx" ON "extension_link_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "extension_link_tokens_token_hash_key" ON "extension_link_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "sync_receipts_linked_extension_id_created_at_idx" ON "sync_receipts"("linked_extension_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sync_receipts_linked_extension_id_client_item_id_key" ON "sync_receipts"("linked_extension_id", "client_item_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "sessions"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- AddForeignKey
ALTER TABLE "vod_aliases" ADD CONSTRAINT "vod_aliases_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_vods" ADD CONSTRAINT "users_vods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_vods" ADD CONSTRAINT "users_vods_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips_playlists" ADD CONSTRAINT "clips_playlists_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips_playlists" ADD CONSTRAINT "clips_playlists_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists_vods" ADD CONSTRAINT "playlists_vods_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists_vods" ADD CONSTRAINT "playlists_vods_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_clips" ADD CONSTRAINT "favorite_clips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_clips" ADD CONSTRAINT "favorite_clips_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_playlists" ADD CONSTRAINT "favorite_playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_playlists" ADD CONSTRAINT "favorite_playlists_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_extensions" ADD CONSTRAINT "linked_extensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_link_tokens" ADD CONSTRAINT "extension_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_receipts" ADD CONSTRAINT "sync_receipts_linked_extension_id_fkey" FOREIGN KEY ("linked_extension_id") REFERENCES "linked_extensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GENERATED_AUGMENT_BEGIN eb5be8940c8b
-- 以下は schema.prisma の注釈から自動生成されています (partialIndex/partialUnique/raw/drop)
-- kind: partialIndex
CREATE INDEX clips_user_id_created_at_idx
  ON "public"."clips"("user_id","created_at")
  WHERE deleted_at IS NULL;

-- kind: partialIndex
CREATE INDEX clips_vod_id_created_at_idx
  ON "public"."clips"("vod_id","created_at")
  WHERE deleted_at IS NULL;

-- kind: partialIndex
CREATE INDEX playlists_user_id_created_at_idx
  ON "public"."playlists"("user_id","created_at")
  WHERE deleted_at IS NULL;

-- kind: partialIndex
CREATE INDEX linked_extensions_user_id_last_seen_active_idx
  ON "public"."linked_extensions"("user_id","last_seen_at")
  WHERE revoked_at IS NULL;

-- kind: partialUnique
CREATE UNIQUE INDEX users_email_unique_active
  ON "public"."users"("email")
  WHERE deleted_at IS NULL;

-- kind: partialUnique
CREATE UNIQUE INDEX vods_name_unique_active
  ON "public"."vods"("name")
  WHERE deleted_at IS NULL;

-- kind: partialUnique
CREATE UNIQUE INDEX vods_code_unique_active
  ON "public"."vods"("code")
  WHERE deleted_at IS NULL;

-- kind: partialUnique
CREATE UNIQUE INDEX playlists_user_id_name_unique_active
  ON "public"."playlists"("user_id","name")
  WHERE deleted_at IS NULL;

-- kind: partialUnique
CREATE UNIQUE INDEX linked_extensions_extension_instance_id_active_unique
  ON "public"."linked_extensions"("extension_instance_id")
  WHERE revoked_at IS NULL;

-- kind: raw
ALTER TABLE "public"."clips"
  ADD CONSTRAINT clips_time_ck CHECK (start_ms >= 0 AND end_ms > start_ms);

-- kind: raw
CREATE INDEX IF NOT EXISTS clips_title_trgm_gin
  ON "public"."clips" USING GIN (title gin_trgm_ops)
  WHERE deleted_at IS NULL;
-- GENERATED_AUGMENT_END eb5be8940c8b
