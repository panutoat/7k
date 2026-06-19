import { Category, CATEGORIES, UnitKind } from "./types";

const VALID_CATEGORIES = CATEGORIES.map((c) => c.id) as Category[];
const VALID_KINDS: UnitKind[] = ["character", "pet"];

export interface ValidUnitInput {
  name: string;
  category: Category;
  kind: UnitKind;
  stars: number;
  hue: number;
}

/** Validate a units POST/PUT body. Returns the cleaned value or an error message. */
export function parseUnitInput(
  body: Record<string, unknown>
): { value: ValidUnitInput } | { error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "กรุณากรอกชื่อตัวละคร" };

  const category = body.category as Category;
  if (!VALID_CATEGORIES.includes(category)) return { error: "category ไม่ถูกต้อง" };

  const kind = body.kind as UnitKind;
  if (!VALID_KINDS.includes(kind)) return { error: "kind ไม่ถูกต้อง" };

  const stars = clampInt(body.stars, 1, 6, 6);
  const hue = clampInt(body.hue, 0, 360, 0);

  return { value: { name, category, kind, stars, hue } };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
