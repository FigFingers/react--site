-- Enable Extensions(add by handwriting)
CREATE EXTENSION IF NOT EXISTS citext;


-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
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
CREATE TABLE "public"."vods" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vod_aliases" (
    "id" SERIAL NOT NULL,
    "vod_id" INTEGER NOT NULL,
    "alias" CITEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vod_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clips" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
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
    -- "duration_ms" INTEGER NOT NULL,
    -- クリップの長さ(ms)を生成列で保持（start_ms/end_ms から算出）
    "duration_ms" int GENERATED ALWAYS AS (end_ms - start_ms) STORED NOT NULL,

    CONSTRAINT "clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."playlists" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users_vods" (
    "user_id" INTEGER NOT NULL,
    "vod_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_vods_pkey" PRIMARY KEY ("user_id","vod_id")
);

-- CreateTable
CREATE TABLE "public"."clips_playlists" (
    "clip_id" INTEGER NOT NULL,
    "playlist_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clips_playlists_pkey" PRIMARY KEY ("clip_id","playlist_id")
);

-- CreateTable
CREATE TABLE "public"."playlists_vods" (
    "playlist_id" INTEGER NOT NULL,
    "vod_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlists_vods_pkey" PRIMARY KEY ("playlist_id","vod_id")
);

-- CreateTable
CREATE TABLE "public"."favorite_clips" (
    "user_id" INTEGER NOT NULL,
    "clip_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_clips_pkey" PRIMARY KEY ("user_id","clip_id")
);

-- CreateTable
CREATE TABLE "public"."favorite_playlists" (
    "user_id" INTEGER NOT NULL,
    "playlist_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_playlists_pkey" PRIMARY KEY ("user_id","playlist_id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
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
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE UNIQUE INDEX "vods_code_key" ON "public"."vods"("code");

-- CreateIndex
CREATE INDEX "vod_aliases_vod_id_idx" ON "public"."vod_aliases"("vod_id");

-- CreateIndex
CREATE UNIQUE INDEX "vod_aliases_alias_key" ON "public"."vod_aliases"("alias");

-- CreateIndex
CREATE INDEX "users_vods_vod_id_idx" ON "public"."users_vods"("vod_id");

-- CreateIndex
CREATE INDEX "clips_playlists_playlist_id_created_at_idx" ON "public"."clips_playlists"("playlist_id", "created_at");

-- CreateIndex
CREATE INDEX "playlists_vods_vod_id_idx" ON "public"."playlists_vods"("vod_id");

-- CreateIndex
CREATE INDEX "playlists_vods_playlist_id_created_at_idx" ON "public"."playlists_vods"("playlist_id", "created_at");

-- CreateIndex
CREATE INDEX "favorite_clips_user_id_created_at_idx" ON "public"."favorite_clips"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "favorite_clips_clip_id_idx" ON "public"."favorite_clips"("clip_id");

-- CreateIndex
CREATE INDEX "favorite_playlists_user_id_created_at_idx" ON "public"."favorite_playlists"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "favorite_playlists_playlist_id_idx" ON "public"."favorite_playlists"("playlist_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "public"."accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "public"."accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "public"."sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "public"."sessions"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- AddForeignKey
ALTER TABLE "public"."vod_aliases" ADD CONSTRAINT "vod_aliases_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "public"."vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clips" ADD CONSTRAINT "clips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clips" ADD CONSTRAINT "clips_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "public"."vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."playlists" ADD CONSTRAINT "playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users_vods" ADD CONSTRAINT "users_vods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users_vods" ADD CONSTRAINT "users_vods_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "public"."vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clips_playlists" ADD CONSTRAINT "clips_playlists_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clips_playlists" ADD CONSTRAINT "clips_playlists_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."playlists_vods" ADD CONSTRAINT "playlists_vods_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."playlists_vods" ADD CONSTRAINT "playlists_vods_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "public"."vods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_clips" ADD CONSTRAINT "favorite_clips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_clips" ADD CONSTRAINT "favorite_clips_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_playlists" ADD CONSTRAINT "favorite_playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_playlists" ADD CONSTRAINT "favorite_playlists_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Add by handwriting
-- 生存ユーザーのみ: mail 一意
CREATE UNIQUE INDEX users_email_unique_active
  ON "public"."users"(email)
  WHERE deleted_at IS NULL;

-- クリップの時間一貫性（start_ms >= 0 かつ end_ms > start_ms）
ALTER TABLE "public"."clips"
  ADD CONSTRAINT clips_time_ck CHECK (start_ms >= 0 AND end_ms > start_ms);

-- 生存プレイリストのみ: ユーザー内 name 一意
CREATE UNIQUE INDEX playlists_user_name_unique_active
  ON "public"."playlists"(user_id, name)
  WHERE deleted_at IS NULL;

-- 生存VODのみ: 表示名 name 一意
CREATE UNIQUE INDEX vods_name_unique_active
  ON "public"."vods"(name)
  WHERE deleted_at IS NULL;

-- 生存部分インデックス
CREATE INDEX clips_user_created_at_idx ON "public"."clips"(user_id, created_at) WHERE deleted_at IS NULL;

CREATE INDEX clips_vod_created_at_idx ON "public"."clips"(vod_id, created_at) WHERE deleted_at IS NULL;

CREATE INDEX playlists_user_created_at_idx ON "public"."playlists"(user_id, created_at) WHERE deleted_at IS NULL;

-- Partial title match search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX clips_title_trgm_gin
  ON  "public"."clips" USING GIN (title gin_trgm_ops)
  WHERE deleted_at IS NULL;
