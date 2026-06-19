import { Category, Formation, Team, Unit, UnitKind } from "./types";
import { DEFAULT_UNITS } from "./data";
import { getDb } from "./dbClient";

// A single shared schema-ready promise across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var _pgReady: Promise<void> | undefined;
}

/** Backwards-compatible alias — returns the active DB client. */
function getPool() {
  return getDb();
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  enemy_type  TEXT NOT NULL CHECK (enemy_type IN ('tank','magic','physical','other')),
  formation   JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS units (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('o7k','awake','gold-top','gold-bottom','epic','legend')),
  kind        TEXT NOT NULL CHECK (kind IN ('character','pet')),
  stars       INT  NOT NULL DEFAULT 6,
  hue         INT  NOT NULL DEFAULT 0,
  image       BYTEA,
  image_mime  TEXT,
  image_url   TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for databases created before image_url existed.
ALTER TABLE units ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS units_category_idx ON units (category);
CREATE INDEX IF NOT EXISTS units_sort_idx ON units (sort_order, created_at);
`;

/** Insert the default roster the first time the units table is empty. */
async function seedUnits(): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query<{ n: string }>(
    "SELECT count(*)::text AS n FROM units"
  );
  if (Number(rows[0]?.n ?? "0") > 0) return;

  for (let i = 0; i < DEFAULT_UNITS.length; i++) {
    const u = DEFAULT_UNITS[i];
    await pool.query(
      `INSERT INTO units (id, name, category, kind, stars, hue, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.name, u.category, u.kind, u.stars, u.hue, i]
    );
  }
}

/** Lazily ensure the schema exists and is seeded (runs once per process). */
export function ensureSchema(): Promise<void> {
  if (!global._pgReady) {
    global._pgReady = getPool()
      .exec(SCHEMA)
      .then(() => seedUnits())
      .then(() => undefined)
      .catch((err) => {
        global._pgReady = undefined; // allow retry on next request
        throw err;
      });
  }
  return global._pgReady;
}

interface TeamRow {
  id: string;
  name: string;
  enemy_type: Team["enemyType"];
  formation: Formation;
  created_at: Date;
}

function rowToTeam(r: TeamRow): Team {
  return {
    id: r.id,
    name: r.name,
    enemyType: r.enemy_type,
    formation: r.formation,
    createdAt: r.created_at.toISOString(),
  };
}

export async function listTeams(): Promise<Team[]> {
  await ensureSchema();
  const { rows } = await getPool().query<TeamRow>(
    "SELECT id, name, enemy_type, formation, created_at FROM teams ORDER BY created_at DESC"
  );
  return rows.map(rowToTeam);
}

export async function createTeam(input: {
  name: string;
  enemyType: Team["enemyType"];
  formation: Formation;
}): Promise<Team> {
  await ensureSchema();
  const { rows } = await getPool().query<TeamRow>(
    `INSERT INTO teams (name, enemy_type, formation)
     VALUES ($1, $2, $3)
     RETURNING id, name, enemy_type, formation, created_at`,
    [input.name, input.enemyType, JSON.stringify(input.formation)]
  );
  return rowToTeam(rows[0]);
}

export async function deleteTeam(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM teams WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Units (ตัวละคร / สัตว์เลี้ยง)
// ---------------------------------------------------------------------------

interface UnitRow {
  id: string;
  name: string;
  category: Category;
  kind: UnitKind;
  stars: number;
  hue: number;
  has_image: boolean;
  image_url: string | null;
  rev: string; // epoch seconds of updated_at, used to bust the image cache
}

function rowToUnit(r: UnitRow): Unit {
  // An external link (e.g. Google Drive) wins; otherwise fall back to an
  // uploaded blob served from our own endpoint, or null for the gradient.
  const image = r.image_url
    ? r.image_url
    : r.has_image
    ? `/api/units/${r.id}/image?v=${r.rev}`
    : null;
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    kind: r.kind,
    stars: r.stars,
    hue: r.hue,
    image,
  };
}

const UNIT_SELECT = `
  SELECT id, name, category, kind, stars, hue, image_url,
         (image IS NOT NULL) AS has_image,
         floor(extract(epoch from updated_at))::text AS rev
  FROM units`;

export async function listUnits(): Promise<Unit[]> {
  await ensureSchema();
  const { rows } = await getPool().query<UnitRow>(
    `${UNIT_SELECT} ORDER BY sort_order, created_at`
  );
  return rows.map(rowToUnit);
}

export async function getUnit(id: string): Promise<Unit | null> {
  await ensureSchema();
  const { rows } = await getPool().query<UnitRow>(
    `${UNIT_SELECT} WHERE id = $1`,
    [id]
  );
  return rows[0] ? rowToUnit(rows[0]) : null;
}

export interface UnitInput {
  name: string;
  category: Category;
  kind: UnitKind;
  stars: number;
  hue: number;
}

function slugify(name: string, category: string): string {
  const base = `${category}-${name}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
  return base || `unit-${Date.now()}`;
}

export async function createUnit(input: UnitInput): Promise<Unit> {
  await ensureSchema();
  const pool = getPool();

  // Place new units at the end of their kind's ordering.
  const { rows: maxRows } = await pool.query<{ m: number | null }>(
    "SELECT max(sort_order) AS m FROM units"
  );
  const sortOrder = (maxRows[0]?.m ?? 0) + 1;

  // Derive a readable id, falling back to a suffix on collision.
  let id = slugify(input.name, input.category);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { rows } = await pool.query<UnitRow>(
      `INSERT INTO units (id, name, category, kind, stars, hue, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, name, category, kind, stars, hue,
                 image_url, false AS has_image, '0' AS rev`,
      [id, input.name, input.category, input.kind, input.stars, input.hue, sortOrder]
    );
    if (rows[0]) return rowToUnit(rows[0]);
    id = `${slugify(input.name, input.category)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new Error("could not generate a unique unit id");
}

export async function updateUnit(
  id: string,
  input: UnitInput
): Promise<Unit | null> {
  await ensureSchema();
  const { rows } = await getPool().query<UnitRow>(
    `UPDATE units
     SET name = $2, category = $3, kind = $4, stars = $5, hue = $6,
         updated_at = now()
     WHERE id = $1
     RETURNING id, name, category, kind, stars, hue, image_url,
               (image IS NOT NULL) AS has_image,
               floor(extract(epoch from updated_at))::text AS rev`,
    [id, input.name, input.category, input.kind, input.stars, input.hue]
  );
  return rows[0] ? rowToUnit(rows[0]) : null;
}

export async function deleteUnit(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM units WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export async function setUnitImage(
  id: string,
  data: Buffer,
  mime: string
): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query(
    `UPDATE units
     SET image = $2, image_mime = $3, image_url = NULL, updated_at = now()
     WHERE id = $1`,
    [id, data, mime]
  );
  return (rowCount ?? 0) > 0;
}

/** Point a unit at an external image URL (e.g. Google Drive). Stores no bytes. */
export async function setUnitImageUrl(
  id: string,
  url: string
): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query(
    `UPDATE units
     SET image_url = $2, image = NULL, image_mime = NULL, updated_at = now()
     WHERE id = $1`,
    [id, url]
  );
  return (rowCount ?? 0) > 0;
}

export async function getUnitImage(
  id: string
): Promise<{ data: Uint8Array; mime: string } | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{
    image: Uint8Array | null;
    image_mime: string | null;
  }>("SELECT image, image_mime FROM units WHERE id = $1", [id]);
  const row = rows[0];
  if (!row || !row.image) return null;
  return { data: row.image, mime: row.image_mime || "image/png" };
}
