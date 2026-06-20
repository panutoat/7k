"use client";

import { useState } from "react";
import {
  Formation,
  FORMATION_TYPES,
  FormationType,
  layoutFor,
  MAX_HEROES,
  MAX_SKILL_ORDER,
  RingType,
  SkillTrack,
  Slot,
  formationHeroIds,
  formationUnitIds,
  orderedCount,
  reshapeFormation,
} from "@/lib/types";
import { FormationGrid, SlotRef } from "./FormationGrid";
import { CharacterPicker } from "./CharacterPicker";
import { FullRosterModal } from "./FullRosterModal";

function clone(f: Formation): Formation {
  return JSON.parse(JSON.stringify(f));
}
function getSlot(f: Formation, ref: SlotRef): Slot {
  if (ref.row === "pet") return f.pet;
  return f[ref.row][ref.index];
}
function setSlot(f: Formation, ref: SlotRef, slot: Slot) {
  if (ref.row === "pet") f.pet = slot;
  else f[ref.row][ref.index] = slot;
}
function allSlots(f: Formation): Slot[] {
  return [...f.back, ...f.front, f.pet];
}

/** Re-pack the skill-order numbers across both tracks to a tight 1..n. */
function renumber(f: Formation) {
  const entries: { slot: Slot; key: "top" | "bottom"; val: number }[] = [];
  for (const s of allSlots(f)) {
    if (s.top != null) entries.push({ slot: s, key: "top", val: s.top });
    if (s.bottom != null) entries.push({ slot: s, key: "bottom", val: s.bottom });
  }
  entries
    .sort((a, b) => a.val - b.val)
    .forEach((e, i) => (e.slot[e.key] = i + 1));
}

/**
 * Controlled editor for a single formation: the grid + character picker plus
 * all the placement / skill-order logic. Used by both the defense editor
 * (admin) and the attack-team editor (member).
 *
 * `blockedUnitIds` are heroes already used elsewhere (e.g. the member's other
 * attack teams); placing one is rejected with a message.
 */
export function FormationEditor({
  value,
  onChange,
  blockedUnitIds,
}: {
  value: Formation;
  onChange: (f: Formation) => void;
  blockedUnitIds?: Set<string>;
}) {
  const [activeSlot, setActiveSlot] = useState<SlotRef | null>(null);
  const [pickerKind, setPickerKind] = useState<"character" | "pet">("character");
  const [showRoster, setShowRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clicking a slot focuses it and jumps the picker to the right tab.
  function focusSlot(ref: SlotRef) {
    setActiveSlot(ref);
    setPickerKind(ref.row === "pet" ? "pet" : "character");
  }

  function firstEmpty(): SlotRef | null {
    const order: SlotRef[] = [
      ...value.back.map((_, i) => ({ row: "back", index: i } as SlotRef)),
      ...value.front.map((_, i) => ({ row: "front", index: i } as SlotRef)),
    ];
    return order.find((r) => getSlot(value, r).unitId == null) ?? null;
  }

  function placeUnit(unit: { id: string; kind?: string }) {
    if (blockedUnitIds?.has(unit.id)) {
      setError("ตัวละครนี้ถูกใช้ในทีมอื่นของคุณแล้ว");
      return;
    }
    // already placed in this formation?
    if (formationUnitIds(value).includes(unit.id)) {
      setError("ตัวละครนี้อยู่ในทีมนี้แล้ว");
      return;
    }
    const target = activeSlot ?? firstEmpty();
    if (!target) return;
    // Cap heroes (back/front rows) at MAX_HEROES; the pet slot is separate.
    if (target.row !== "pet") {
      const replacing = getSlot(value, target).unitId != null;
      if (!replacing && formationHeroIds(value).length >= MAX_HEROES) {
        setError(`เลือกฮีโร่ได้สูงสุด ${MAX_HEROES} ตัว`);
        return;
      }
    }
    const next = clone(value);
    setSlot(next, target, { unitId: unit.id, top: null, bottom: null, rings: [] });
    onChange(next);
    setActiveSlot(null);
    setError(null);
  }

  function toggleRing(ref: SlotRef, ring: RingType) {
    const next = clone(value);
    const slot = getSlot(next, ref);
    if (!slot.unitId) return;
    const set = new Set(slot.rings ?? []);
    set.has(ring) ? set.delete(ring) : set.add(ring);
    slot.rings = [...set];
    onChange(next);
  }

  function toggleTrack(ref: SlotRef, track: SkillTrack) {
    const next = clone(value);
    const slot = getSlot(next, ref);
    if (!slot.unitId) return;
    const key = track === "T" ? "top" : "bottom";
    if (slot[key] != null) {
      slot[key] = null; // un-reserve this track
    } else {
      if (orderedCount(next) >= MAX_SKILL_ORDER) {
        setError(`กำหนดลำดับสกิลได้สูงสุด ${MAX_SKILL_ORDER} ลำดับ`);
        return;
      }
      slot[key] = orderedCount(next) + 1;
    }
    renumber(next);
    setError(null);
    onChange(next);
  }

  function clearSlot(ref: SlotRef) {
    const next = clone(value);
    setSlot(next, ref, { unitId: null, top: null, bottom: null, rings: [] });
    renumber(next);
    onChange(next);
  }

  // Drag & drop: swap two hero slots (keeps each hero's skill reservations).
  function swapSlots(a: SlotRef, b: SlotRef) {
    if (a.row === "pet" || b.row === "pet") return;
    if (a.row === b.row && a.index === b.index) return;
    const next = clone(value);
    const sa = { ...getSlot(next, a) };
    const sb = { ...getSlot(next, b) };
    setSlot(next, a, sb);
    setSlot(next, b, sa);
    onChange(next);
  }

  function setType(type: FormationType) {
    onChange(reshapeFormation(value, type));
  }

  // Hide units already placed here (and any externally blocked ones).
  const excludeIds = new Set<string>([
    ...formationUnitIds(value),
    ...(blockedUnitIds ?? []),
  ]);

  return (
    <div className="space-y-3">
      {/* Formation preset (รูปแบบ) */}
      <div>
        <p className="mb-1.5 text-sm text-gray-500">รูปแบบ (Formation)</p>
        <div className="flex flex-wrap gap-2">
          {FORMATION_TYPES.map((t) => {
            const active = (value.type ?? "basic") === t.id;
            const lay = layoutFor(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition ${
                  active
                    ? "border-rose-400 bg-rose-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FormationDiagram back={lay.back} front={lay.front} />
                <span>
                  <span
                    className={`block text-sm font-semibold ${
                      active ? "text-rose-600" : "text-gray-700"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="block text-[11px] text-gray-400">{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSlot && (
        <p className="text-sm font-medium text-rose-500">
          เลือกตัวละครจากด้านล่างเพื่อใส่ในช่องที่เลือก
        </p>
      )}
      <p className="text-xs text-gray-400">เคล็ดลับ: ลากตัวละครเพื่อสลับตำแหน่งได้</p>
      <FormationGrid
        formation={value}
        onPick={focusSlot}
        onToggle={toggleTrack}
        onClear={clearSlot}
        onSwap={swapSlots}
        onToggleRing={toggleRing}
      />
      <CharacterPicker
        onPick={placeUnit}
        onOpenFullRoster={() => setShowRoster(true)}
        kind={pickerKind}
        excludeIds={excludeIds}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}

      {showRoster && (
        <FullRosterModal
          excludeIds={excludeIds}
          onPick={(u) => {
            placeUnit(u);
            setShowRoster(false);
          }}
          onClose={() => setShowRoster(false)}
        />
      )}
    </div>
  );
}

/** Tiny back(red)/front(blue) dot diagram for a formation preset. */
function FormationDiagram({ back, front }: { back: number; front: number }) {
  const dots = (n: number, color: string) =>
    Array.from({ length: n }, (_, i) => (
      <span
        key={i}
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
    ));
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className="flex gap-0.5">{dots(back, "#ef6b78")}</span>
      <span className="flex gap-0.5">{dots(front, "#7aa2f7")}</span>
    </span>
  );
}
