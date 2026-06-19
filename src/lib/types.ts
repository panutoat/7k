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
  /** Which track the unit's skill belongs to (max 3 across the formation). */
  track: SkillTrack | null;
  /** Skill order number 1-3 (set when a track is chosen). */
  order: number | null;
}

export interface Formation {
  /** Back row — up to 3 slots. */
  back: Slot[];
  /** Front row — up to 2 slots. */
  front: Slot[];
  /** Single pet slot. */
  pet: Slot;
}

export interface Team {
  id: string;
  name: string;
  enemyType: EnemyType;
  formation: Formation;
  createdAt: string;
}

export function emptySlot(): Slot {
  return { unitId: null, track: null, order: null };
}

export function emptyFormation(): Formation {
  return {
    back: [emptySlot(), emptySlot(), emptySlot()],
    front: [emptySlot(), emptySlot()],
    pet: emptySlot(),
  };
}
