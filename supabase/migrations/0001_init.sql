-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0001_init.sql
-- Phase 1 database schema: all core tables with PostGIS spatial support.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable PostGIS for geographic queries (SRID 4326 = WGS-84 lat/lng)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES  (one row per auth.users entry; extended user metadata)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'agent', 'admin')),
  tier        TEXT NOT NULL DEFAULT 'free'
                CHECK (tier IN ('free', 'pro', 'premium')),
  bio         TEXT,
  website     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROPERTIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug            TEXT        NOT NULL UNIQUE,
  title           JSONB       NOT NULL DEFAULT '{}',
  description     JSONB       NOT NULL DEFAULT '{}',
  price           NUMERIC(15, 2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'AMD'
                                CHECK (currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  area_m2         NUMERIC(10, 2),
  rooms           SMALLINT,
  bedrooms        SMALLINT,
  bathrooms       SMALLINT,
  floor           SMALLINT,
  floors_total    SMALLINT,
  year_built      SMALLINT,
  property_type   TEXT        NOT NULL
                                CHECK (property_type IN ('apartment', 'house', 'commercial', 'land', 'garage')),
  deal_type       TEXT        NOT NULL
                                CHECK (deal_type IN ('sale', 'rent')),
  status          TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('active', 'draft', 'pending', 'archived', 'sold')),
  city            TEXT        NOT NULL,
  district        TEXT,
  address         TEXT,
  amenities       TEXT[]      NOT NULL DEFAULT '{}',
  -- GEOGRAPHY(POINT, 4326): stores lon/lat in WGS-84 (standard for web maps)
  location        GEOGRAPHY(POINT, 4326),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  listed_at       TIMESTAMPTZ
);

-- GiST spatial index enables efficient ST_DWithin / ST_Distance proximity queries
CREATE INDEX IF NOT EXISTS properties_location_idx
  ON properties USING GIST (location);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROPERTY_MEDIA  (images, videos, virtual tours linked to a property)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  media_type    TEXT        NOT NULL DEFAULT 'image'
                              CHECK (media_type IN ('image', 'video', 'virtual_tour')),
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- FAVORITES  (user bookmarks for properties)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id   UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS  (a thread between a buyer and a seller, optionally tied to a property)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID        REFERENCES properties(id) ON DELETE SET NULL,
  buyer_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES  (individual messages within a conversation)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body              TEXT        NOT NULL,
  is_read           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
