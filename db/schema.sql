-- Schema for the 7k-combo team builder.

CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  enemy_type  TEXT NOT NULL CHECK (enemy_type IN ('tank','magic','physical','other')),
  formation   JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teams_enemy_type_idx ON teams (enemy_type);
CREATE INDEX IF NOT EXISTS teams_created_at_idx ON teams (created_at DESC);

-- Roster of playable characters / pets. Portrait images are stored inline as
-- bytea and served via /api/units/[id]/image. The app auto-seeds this table
-- from src/lib/data.ts the first time it is empty.
CREATE TABLE IF NOT EXISTS units (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('o7k','awake','gold-top','gold-bottom','epic','legend')),
  kind        TEXT NOT NULL CHECK (kind IN ('character','pet')),
  stars       INT  NOT NULL DEFAULT 6,
  hue         INT  NOT NULL DEFAULT 0,
  image       BYTEA,
  image_mime  TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS units_category_idx ON units (category);
CREATE INDEX IF NOT EXISTS units_sort_idx ON units (sort_order, created_at);
