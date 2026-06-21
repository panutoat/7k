// Shared domain types for the 7k-combo team builder.

/** Enemy team archetypes (ประเภททีมศัตรู). */
export type EnemyType = "tank" | "magic" | "physical" | "other";

export const ENEMY_TYPES: { id: EnemyType; label: string; color: string }[] = [
  { id: "tank", label: "ถึก", color: "#9ca3af" },
  { id: "magic", label: "เวทย์", color: "#38bdf8" },
  { id: "physical", label: "กายภาพ", color: "#ef4452" },
  { id: "other", label: "อื่น ๆ", color: "#a78bfa" },
];

/** Roster category (matches the "all characters" modal grouping). */
export type Category =
  | "o7k"
  | "awake"
  | "gold-top"
  | "gold-bottom"
  | "epic"
  | "legend";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "o7k", label: "O7K" },
  { id: "awake", label: "Awake" },
  { id: "gold-top", label: "ทองบน" },
  { id: "gold-bottom", label: "ทองล่าง" },
  { id: "epic", label: "อีปิค" },
  { id: "legend", label: "เลเจนด์" },
];

export type UnitKind = "character" | "pet";

export interface Unit {
  id: string;
  name: string;
  category: Category;
  kind: UnitKind;
  /** Star rating shown on the portrait. */
  stars: number;
  /** Hue (0-360) used to generate a placeholder gradient portrait. */
  hue: number;
  /** URL of the uploaded portrait image, or null to fall back to the gradient. */
  image: string | null;
}

/** Skill-ordering toggle on a slot: T = top track, B = bottom track. */
export type SkillTrack = "T" | "B";

/** Legendary ring types (stack different kinds, up to 3 per hero). */
export type RingType = "revive" | "immortal" | "shield";

export const RINGS: {
  id: RingType;
  label: string;
  short: string;
  color: string;
}[] = [
  { id: "revive", label: "คืนชีพ", short: "ชีพ", color: "#a855f7" },
  { id: "immortal", label: "อมตะ", short: "อมตะ", color: "#ef4444" },
  { id: "shield", label: "โล่ป้องกัน", short: "โล่", color: "#f59e0b" },
];

export interface Slot {
  unitId: string | null;
  /** Skill-order number (1..MAX_SKILL_ORDER) for this unit's TOP skill, or null. */
  top: number | null;
  /** Skill-order number for this unit's BOTTOM skill, or null. */
  bottom: number | null;
  /** Legendary rings on this hero (distinct kinds). */
  rings?: RingType[];
}

/** Formation preset (รูปแบบ) — like 7k's basic/balanced/attack/defense. */
export type FormationType = "basic" | "balanced" | "attack" | "defense";

export const FORMATION_TYPES: {
  id: FormationType;
  label: string;
  hint: string;
}[] = [
  { id: "basic", label: "พื้นฐาน", hint: "หลัง 3 / หน้า 2" },
  { id: "balanced", label: "สมดุล", hint: "หลัง 2 / หน้า 3" },
  { id: "attack", label: "โจมตี", hint: "หลัง 4 / หน้า 1" },
  { id: "defense", label: "ป้องกัน", hint: "หลัง 1 / หน้า 4" },
];

export interface Formation {
  /** Back row — up to 3 slots. */
  back: Slot[];
  /** Front row — up to 2 slots. */
  front: Slot[];
  /** Single pet slot. */
  pet: Slot;
  /** Chosen formation preset (defaults to "basic"). */
  type?: FormationType;
}

/** Max heroes (characters) placeable in one team. */
export const MAX_HEROES = 3;
/** Max total skill-order reservations across both tracks. */
export const MAX_SKILL_ORDER = 3;

/** Back/front slot split for each formation preset (always 5 hero slots). */
export function layoutFor(type: FormationType | undefined): {
  back: number;
  front: number;
} {
  switch (type) {
    case "balanced":
      return { back: 2, front: 3 };
    case "attack":
      return { back: 4, front: 1 };
    case "defense":
      return { back: 1, front: 4 };
    case "basic":
    default:
      return { back: 3, front: 2 };
  }
}

export function emptySlot(): Slot {
  return { unitId: null, top: null, bottom: null, rings: [] };
}

/**
 * Re-split the back/front rows for a new formation preset, keeping already
 * placed heroes (and their skill orders). Heroes compact toward the start.
 */
export function reshapeFormation(f: Formation, type: FormationType): Formation {
  const { back, front } = layoutFor(type);
  const placed = [...f.back, ...f.front].filter((s) => s.unitId);
  const slots: Slot[] = [];
  for (let i = 0; i < back + front; i++) slots.push(placed[i] ?? emptySlot());
  return {
    type,
    back: slots.slice(0, back),
    front: slots.slice(back, back + front),
    pet: f.pet,
  };
}

export function emptyFormation(): Formation {
  return {
    back: [emptySlot(), emptySlot(), emptySlot()],
    front: [emptySlot(), emptySlot()],
    pet: emptySlot(),
    type: "basic",
  };
}

/** All non-empty unit ids in a formation (characters + pet). */
export function formationUnitIds(f: Formation): string[] {
  const ids: string[] = [];
  for (const s of [...f.back, ...f.front, f.pet]) {
    if (s?.unitId) ids.push(s.unitId);
  }
  return ids;
}

/** Hero unit ids only (back + front rows; excludes the pet). */
export function formationHeroIds(f: Formation): string[] {
  return [...f.back, ...f.front].filter((s) => s?.unitId).map((s) => s.unitId!);
}

/** Count of skill-order reservations across both tracks of all slots. */
export function orderedCount(f: Formation): number {
  return [...f.back, ...f.front, f.pet].reduce(
    (n, s) => n + (s.top != null ? 1 : 0) + (s.bottom != null ? 1 : 0),
    0
  );
}

// ---------------------------------------------------------------------------
// Guild war
// ---------------------------------------------------------------------------

/** How many attack teams each member may field per war. */
export const ATTACK_SLOTS = 5;

export type Role = "admin" | "member";

export interface Session {
  role: Role;
  /** Set for member sessions. */
  memberId?: string;
  name?: string;
}

export interface Member {
  id: string;
  name: string;
  /** Last time this member logged in (for participation tracking). */
  lastLoginAt: string | null;
  /** Number of logins today (00:00–23:59 Asia/Bangkok). */
  loginToday: number;
  createdAt: string;
}

export interface War {
  id: string;
  /** Target guild name. */
  name: string;
  active: boolean;
  /** When true, members cannot edit their teams (war ended). */
  locked: boolean;
  /** Final scores + result, entered by an admin after the war. */
  ourScore: number | null;
  enemyScore: number | null;
  result: "win" | "lose" | null;
  createdAt: string;
}

/** An admin-recommended attack team for beating a specific defense. */
export interface RecommendedTeam {
  id: string;
  defenseId: string;
  label: string;
  formation: Formation;
  link: string | null;
  createdAt: string;
}

/**
 * A recommended attack team carried as a template (no own id/result) — used
 * both inside a central-library entry and when copying to/from a war.
 */
export interface RecommendedTemplate {
  label: string;
  formation: Formation;
  link: string | null;
}

/** A reusable defense template stored in the central library. */
export interface LibraryDefense {
  id: string;
  label: string;
  formation: Formation;
  link: string | null;
  /** Attack teams recommended for breaking this defense (carried with it). */
  recommended: RecommendedTemplate[];
  /** If set, this is one of OUR guild's chosen defenses (rank for ordering). */
  defenseRank: number | null;
  createdAt: string;
}

/** Validate + normalize recommended-team templates from untrusted request input. */
export function sanitizeRecommended(input: unknown): RecommendedTemplate[] {
  if (!Array.isArray(input)) return [];
  const out: RecommendedTemplate[] = [];
  for (const raw of input) {
    const r = raw as Partial<RecommendedTemplate>;
    const f = r?.formation;
    if (!f || !Array.isArray(f.back) || !Array.isArray(f.front)) continue;
    out.push({
      label: String(r.label ?? "").trim(),
      formation: f,
      link: (typeof r.link === "string" ? r.link.trim() : "") || null,
    });
  }
  return out;
}

/** An enemy formation the guild needs to break. */
export interface DefenseTeam {
  id: string;
  warId: string;
  label: string;
  formation: Formation;
  /** Optional 7k-combo (or any) reference link. */
  link: string | null;
  sortOrder: number;
  createdAt: string;
}

export type AttackResult = "win" | "loss" | null;

/** One of a member's attack teams within a war. */
export interface AttackTeam {
  id: string;
  warId: string;
  memberId: string;
  /** 1..ATTACK_SLOTS */
  slot: number;
  /** May be null when an admin only marks an in-game attack as done. */
  formation: Formation | null;
  targetDefenseId: string | null;
  /** Optional 7k-combo (or any) reference link. */
  link: string | null;
  /** Battle result once attacked. */
  result: AttackResult;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}
