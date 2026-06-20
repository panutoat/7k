import {
  AttackTeam,
  Category,
  DefenseTeam,
  Formation,
  formationUnitIds,
  LibraryDefense,
  Member,
  Unit,
  UnitKind,
  War,
} from "./types";
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

-- Guild-war planning -------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wars (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT true,
  our_score    INT,
  enemy_score  INT,
  result       TEXT CHECK (result IN ('win','lose')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defense_teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id      UUID NOT NULL REFERENCES wars(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT '',
  formation   JSONB NOT NULL,
  link        TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attack_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id          UUID NOT NULL REFERENCES wars(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  slot            INT  NOT NULL,
  formation       JSONB,
  target_defense_id UUID REFERENCES defense_teams(id) ON DELETE SET NULL,
  link            TEXT,
  result          TEXT CHECK (result IN ('win','loss')),
  done            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (war_id, member_id, slot)
);

-- Reusable defense templates shared across wars (central library).
CREATE TABLE IF NOT EXISTS defense_library (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL DEFAULT '',
  formation   JSONB NOT NULL,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrations for DBs created before these columns existed.
ALTER TABLE defense_teams ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE attack_teams  ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE attack_teams  ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE wars ADD COLUMN IF NOT EXISTS our_score INT;
ALTER TABLE wars ADD COLUMN IF NOT EXISTS enemy_score INT;
ALTER TABLE wars ADD COLUMN IF NOT EXISTS result TEXT;

CREATE INDEX IF NOT EXISTS defense_war_idx ON defense_teams (war_id, sort_order);
CREATE INDEX IF NOT EXISTS attack_war_member_idx ON attack_teams (war_id, member_id);
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

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

interface MemberRow {
  id: string;
  name: string;
  last_login_at: Date | null;
  created_at: Date;
}
const toMember = (r: MemberRow): Member => ({
  id: r.id,
  name: r.name,
  lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
});

const MEMBER_COLS = "id, name, last_login_at, created_at";

export async function listMembers(): Promise<Member[]> {
  await ensureSchema();
  const { rows } = await getPool().query<MemberRow>(
    `SELECT ${MEMBER_COLS} FROM members ORDER BY name`
  );
  return rows.map(toMember);
}

export async function findMemberByName(name: string): Promise<Member | null> {
  await ensureSchema();
  const { rows } = await getPool().query<MemberRow>(
    `SELECT ${MEMBER_COLS} FROM members WHERE lower(name) = lower($1)`,
    [name]
  );
  return rows[0] ? toMember(rows[0]) : null;
}

export async function createMember(name: string): Promise<Member> {
  await ensureSchema();
  const { rows } = await getPool().query<MemberRow>(
    `INSERT INTO members (name) VALUES ($1) RETURNING ${MEMBER_COLS}`,
    [name]
  );
  return toMember(rows[0]);
}

/** Stamp a member's last login time (called on member login). */
export async function touchMemberLogin(id: string): Promise<void> {
  await ensureSchema();
  await getPool().query("UPDATE members SET last_login_at = now() WHERE id = $1", [id]);
}

export async function renameMember(
  id: string,
  name: string
): Promise<Member | null> {
  await ensureSchema();
  const { rows } = await getPool().query<MemberRow>(
    `UPDATE members SET name = $2 WHERE id = $1 RETURNING ${MEMBER_COLS}`,
    [id, name]
  );
  return rows[0] ? toMember(rows[0]) : null;
}

export async function deleteMember(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM members WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Wars
// ---------------------------------------------------------------------------

interface WarRow {
  id: string;
  name: string;
  active: boolean;
  our_score: number | null;
  enemy_score: number | null;
  result: "win" | "lose" | null;
  created_at: Date;
}
const toWar = (r: WarRow): War => ({
  id: r.id,
  name: r.name,
  active: r.active,
  ourScore: r.our_score,
  enemyScore: r.enemy_score,
  result: r.result,
  createdAt: new Date(r.created_at).toISOString(),
});

const WAR_COLS =
  "id, name, active, our_score, enemy_score, result, created_at";

export async function listWars(activeOnly = false): Promise<War[]> {
  await ensureSchema();
  const { rows } = await getPool().query<WarRow>(
    `SELECT ${WAR_COLS} FROM wars
     ${activeOnly ? "WHERE active = true" : ""}
     ORDER BY created_at DESC`
  );
  return rows.map(toWar);
}

export async function getWar(id: string): Promise<War | null> {
  await ensureSchema();
  const { rows } = await getPool().query<WarRow>(
    `SELECT ${WAR_COLS} FROM wars WHERE id = $1`,
    [id]
  );
  return rows[0] ? toWar(rows[0]) : null;
}

export async function createWar(name: string): Promise<War> {
  await ensureSchema();
  const { rows } = await getPool().query<WarRow>(
    `INSERT INTO wars (name) VALUES ($1) RETURNING ${WAR_COLS}`,
    [name]
  );
  return toWar(rows[0]);
}

export async function updateWar(
  id: string,
  patch: {
    name?: string;
    active?: boolean;
    ourScore?: number | null;
    enemyScore?: number | null;
    result?: "win" | "lose" | null;
  }
): Promise<War | null> {
  await ensureSchema();
  const { rows } = await getPool().query<WarRow>(
    `UPDATE wars SET
       name = COALESCE($2, name),
       active = COALESCE($3, active),
       our_score = CASE WHEN $4::boolean THEN $5 ELSE our_score END,
       enemy_score = CASE WHEN $6::boolean THEN $7 ELSE enemy_score END,
       result = CASE WHEN $8::boolean THEN $9 ELSE result END
     WHERE id = $1
     RETURNING ${WAR_COLS}`,
    [
      id,
      patch.name ?? null,
      patch.active ?? null,
      patch.ourScore !== undefined,
      patch.ourScore ?? null,
      patch.enemyScore !== undefined,
      patch.enemyScore ?? null,
      patch.result !== undefined,
      patch.result ?? null,
    ]
  );
  return rows[0] ? toWar(rows[0]) : null;
}

export async function deleteWar(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM wars WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Defense teams
// ---------------------------------------------------------------------------

interface DefenseRow {
  id: string;
  war_id: string;
  label: string;
  formation: Formation;
  link: string | null;
  sort_order: number;
  created_at: Date;
}
const toDefense = (r: DefenseRow): DefenseTeam => ({
  id: r.id,
  warId: r.war_id,
  label: r.label,
  formation: r.formation,
  link: r.link,
  sortOrder: r.sort_order,
  createdAt: new Date(r.created_at).toISOString(),
});

const DEFENSE_COLS = "id, war_id, label, formation, link, sort_order, created_at";

export async function listDefenses(warId: string): Promise<DefenseTeam[]> {
  await ensureSchema();
  const { rows } = await getPool().query<DefenseRow>(
    `SELECT ${DEFENSE_COLS} FROM defense_teams WHERE war_id = $1 ORDER BY sort_order, created_at`,
    [warId]
  );
  return rows.map(toDefense);
}

export async function createDefense(input: {
  warId: string;
  label: string;
  formation: Formation;
  link: string | null;
}): Promise<DefenseTeam> {
  await ensureSchema();
  const pool = getPool();
  const { rows: maxRows } = await pool.query<{ m: number | null }>(
    "SELECT max(sort_order) AS m FROM defense_teams WHERE war_id = $1",
    [input.warId]
  );
  const sortOrder = (maxRows[0]?.m ?? 0) + 1;
  const { rows } = await pool.query<DefenseRow>(
    `INSERT INTO defense_teams (war_id, label, formation, link, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${DEFENSE_COLS}`,
    [input.warId, input.label, JSON.stringify(input.formation), input.link, sortOrder]
  );
  return toDefense(rows[0]);
}

export async function updateDefense(
  id: string,
  input: { label: string; formation: Formation; link: string | null }
): Promise<DefenseTeam | null> {
  await ensureSchema();
  const { rows } = await getPool().query<DefenseRow>(
    `UPDATE defense_teams SET label = $2, formation = $3, link = $4
     WHERE id = $1 RETURNING ${DEFENSE_COLS}`,
    [id, input.label, JSON.stringify(input.formation), input.link]
  );
  return rows[0] ? toDefense(rows[0]) : null;
}

export async function deleteDefense(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM defense_teams WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Central defense library
// ---------------------------------------------------------------------------

interface LibraryRow {
  id: string;
  label: string;
  formation: Formation;
  link: string | null;
  created_at: Date;
}
const toLibrary = (r: LibraryRow): LibraryDefense => ({
  id: r.id,
  label: r.label,
  formation: r.formation,
  link: r.link,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function listLibrary(): Promise<LibraryDefense[]> {
  await ensureSchema();
  const { rows } = await getPool().query<LibraryRow>(
    "SELECT id, label, formation, link, created_at FROM defense_library ORDER BY created_at DESC"
  );
  return rows.map(toLibrary);
}

export async function createLibrary(input: {
  label: string;
  formation: Formation;
  link: string | null;
}): Promise<LibraryDefense> {
  await ensureSchema();
  const { rows } = await getPool().query<LibraryRow>(
    `INSERT INTO defense_library (label, formation, link)
     VALUES ($1, $2, $3)
     RETURNING id, label, formation, link, created_at`,
    [input.label, JSON.stringify(input.formation), input.link]
  );
  return toLibrary(rows[0]);
}

export async function updateLibrary(
  id: string,
  input: { label: string; formation: Formation; link: string | null }
): Promise<LibraryDefense | null> {
  await ensureSchema();
  const { rows } = await getPool().query<LibraryRow>(
    `UPDATE defense_library SET label = $2, formation = $3, link = $4
     WHERE id = $1
     RETURNING id, label, formation, link, created_at`,
    [id, input.label, JSON.stringify(input.formation), input.link]
  );
  return rows[0] ? toLibrary(rows[0]) : null;
}

export async function deleteLibrary(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query(
    "DELETE FROM defense_library WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Attack teams
// ---------------------------------------------------------------------------

interface AttackRow {
  id: string;
  war_id: string;
  member_id: string;
  slot: number;
  formation: Formation | null;
  target_defense_id: string | null;
  link: string | null;
  result: "win" | "loss" | null;
  done: boolean;
  created_at: Date;
  updated_at: Date;
}
const toAttack = (r: AttackRow): AttackTeam => ({
  id: r.id,
  warId: r.war_id,
  memberId: r.member_id,
  slot: r.slot,
  formation: r.formation,
  targetDefenseId: r.target_defense_id,
  link: r.link,
  result: r.result,
  done: r.done,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
});

const ATTACK_COLS =
  "id, war_id, member_id, slot, formation, target_defense_id, link, result, done, created_at, updated_at";

export async function listAttacks(
  warId: string,
  memberId?: string
): Promise<AttackTeam[]> {
  await ensureSchema();
  const params: unknown[] = [warId];
  let where = "war_id = $1";
  if (memberId) {
    params.push(memberId);
    where += " AND member_id = $2";
  }
  const { rows } = await getPool().query<AttackRow>(
    `SELECT ${ATTACK_COLS} FROM attack_teams WHERE ${where} ORDER BY member_id, slot`,
    params
  );
  return rows.map(toAttack);
}

/** A member's previously-used attack formations from OTHER wars (history). */
export async function listMemberAttackHistory(
  memberId: string,
  excludeWarId: string
): Promise<{ warName: string; formation: Formation; link: string | null }[]> {
  await ensureSchema();
  const { rows } = await getPool().query<{
    war_name: string;
    formation: Formation;
    link: string | null;
  }>(
    `SELECT w.name AS war_name, a.formation, a.link
     FROM attack_teams a JOIN wars w ON w.id = a.war_id
     WHERE a.member_id = $1 AND a.war_id <> $2 AND a.formation IS NOT NULL
     ORDER BY a.updated_at DESC
     LIMIT 30`,
    [memberId, excludeWarId]
  );
  return rows.map((r) => ({
    warName: r.war_name,
    formation: r.formation,
    link: r.link,
  }));
}

/**
 * Heroes already committed by a member in this war, excluding one slot.
 * Used to enforce "no duplicate character across a member's attack teams".
 */
export async function memberUsedUnitIds(
  warId: string,
  memberId: string,
  excludeSlot?: number
): Promise<Set<string>> {
  await ensureSchema();
  const { rows } = await getPool().query<{ formation: Formation | null; slot: number }>(
    `SELECT formation, slot FROM attack_teams
     WHERE war_id = $1 AND member_id = $2`,
    [warId, memberId]
  );
  const used = new Set<string>();
  for (const r of rows) {
    if (excludeSlot != null && r.slot === excludeSlot) continue;
    if (r.formation) for (const id of formationUnitIds(r.formation)) used.add(id);
  }
  return used;
}

/** Insert or update a member's attack team in a given slot. */
export async function upsertAttack(input: {
  warId: string;
  memberId: string;
  slot: number;
  formation: Formation | null;
  targetDefenseId: string | null;
  link: string | null;
  result: "win" | "loss" | null;
  done: boolean;
}): Promise<AttackTeam> {
  await ensureSchema();
  const { rows } = await getPool().query<AttackRow>(
    `INSERT INTO attack_teams (war_id, member_id, slot, formation, target_defense_id, link, result, done)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (war_id, member_id, slot) DO UPDATE SET
       formation = EXCLUDED.formation,
       target_defense_id = EXCLUDED.target_defense_id,
       link = EXCLUDED.link,
       result = EXCLUDED.result,
       done = EXCLUDED.done,
       updated_at = now()
     RETURNING ${ATTACK_COLS}`,
    [
      input.warId,
      input.memberId,
      input.slot,
      input.formation ? JSON.stringify(input.formation) : null,
      input.targetDefenseId,
      input.link,
      input.result,
      input.done,
    ]
  );
  return toAttack(rows[0]);
}

/** Patch the admin/owner-controllable fields of an existing attack row. */
export async function patchAttack(
  id: string,
  patch: {
    done?: boolean;
    targetDefenseId?: string | null;
    result?: "win" | "loss" | null;
  }
): Promise<AttackTeam | null> {
  await ensureSchema();
  const { rows } = await getPool().query<AttackRow>(
    `UPDATE attack_teams SET
       done = COALESCE($2, done),
       target_defense_id = CASE WHEN $3::boolean THEN $4 ELSE target_defense_id END,
       result = CASE WHEN $5::boolean THEN $6 ELSE result END,
       updated_at = now()
     WHERE id = $1
     RETURNING ${ATTACK_COLS}`,
    [
      id,
      patch.done ?? null,
      patch.targetDefenseId !== undefined,
      patch.targetDefenseId ?? null,
      patch.result !== undefined,
      patch.result ?? null,
    ]
  );
  return rows[0] ? toAttack(rows[0]) : null;
}

export async function deleteAttack(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM attack_teams WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export async function getAttack(id: string): Promise<AttackTeam | null> {
  await ensureSchema();
  const { rows } = await getPool().query<AttackRow>(
    `SELECT ${ATTACK_COLS} FROM attack_teams WHERE id = $1`,
    [id]
  );
  return rows[0] ? toAttack(rows[0]) : null;
}
