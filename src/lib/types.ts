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

export interface Slot {
  unitId: string | null;
  /** Skill-order number (1..MAX_SKILL_ORDER) for this unit's TOP skill, or null. */
  top: number | null;
  /** Skill-order number for this unit's BOTTOM skill, or null. */
  bottom: number | null;
}

export interface Formation {
  /** Back row — up to 3 slots. */
  back: Slot[];
  /** Front row — up to 2 slots. */
  front: Slot[];
  /** Single pet slot. */
  pet: Slot;
}

/** Max heroes (characters) placeable in one team. */
export const MAX_HEROES = 3;
/** Max total skill-order reservations across both tracks. */
export const MAX_SKILL_ORDER = 3;

export function emptySlot(): Slot {
  return { unitId: null, top: null, bottom: null };
}

export function emptyFormation(): Formation {
  return {
    back: [emptySlot(), emptySlot(), emptySlot()],
    front: [emptySlot(), emptySlot()],
    pet: emptySlot(),
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
  createdAt: string;
}

export interface War {
  id: string;
  /** Target guild name. */
  name: string;
  active: boolean;
  createdAt: string;
}

/** An enemy formation the guild needs to break. */
export interface DefenseTeam {
  id: string;
  warId: string;
  label: string;
  formation: Formation;
  sortOrder: number;
  createdAt: string;
}

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
  done: boolean;
  createdAt: string;
  updatedAt: string;
}
