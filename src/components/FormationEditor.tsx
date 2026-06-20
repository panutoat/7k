"use client";

import { useState } from "react";
import {
  Formation,
  MAX_HEROES,
  MAX_SKILL_ORDER,
  SkillTrack,
  Slot,
  formationHeroIds,
  formationUnitIds,
  orderedCount,
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
  const [showRoster, setShowRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSlot(next, target, { unitId: unit.id, top: null, bottom: null });
    onChange(next);
    setActiveSlot(null);
    setError(null);
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
    setSlot(next, ref, { unitId: null, top: null, bottom: null });
    renumber(next);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {activeSlot && (
        <p className="text-sm font-medium text-rose-500">
          เลือกตัวละครจากด้านล่างเพื่อใส่ในช่องที่เลือก
        </p>
      )}
      <FormationGrid
        formation={value}
        onPick={(ref) => setActiveSlot(ref)}
        onToggle={toggleTrack}
        onClear={clearSlot}
      />
      <CharacterPicker
        onPick={placeUnit}
        onOpenFullRoster={() => setShowRoster(true)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}

      {showRoster && (
        <FullRosterModal
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
