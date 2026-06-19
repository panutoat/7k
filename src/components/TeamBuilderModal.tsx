"use client";

import { useState } from "react";
import {
  EnemyType,
  Formation,
  SkillTrack,
  Slot,
  Team,
  emptyFormation,
} from "@/lib/types";
import { EnemyTypeTabs } from "./EnemyTypeTabs";
import { FormationGrid, SlotRef } from "./FormationGrid";
import { CharacterPicker } from "./CharacterPicker";
import { FullRosterModal } from "./FullRosterModal";

const MAX_ORDERED = 3;

function cloneFormation(f: Formation): Formation {
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

/** Renumber order fields to 1..n following current ascending order. */
function renumber(f: Formation) {
  const ordered = allSlots(f)
    .filter((s) => s.order != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  ordered.forEach((s, i) => (s.order = i + 1));
}

export function TeamBuilderModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (team: Team) => void;
}) {
  const [name, setName] = useState("");
  const [enemyType, setEnemyType] = useState<EnemyType>("magic");
  const [formation, setFormation] = useState<Formation>(emptyFormation());
  const [activeSlot, setActiveSlot] = useState<SlotRef | null>(null);
  const [showRoster, setShowRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function firstEmpty(): SlotRef | null {
    const order: SlotRef[] = [
      ...formation.back.map((_, i) => ({ row: "back", index: i } as SlotRef)),
      ...formation.front.map((_, i) => ({ row: "front", index: i } as SlotRef)),
    ];
    return order.find((r) => getSlot(formation, r).unitId == null) ?? null;
  }

  function placeUnit(unit: { id: string }) {
    const target = activeSlot ?? firstEmpty();
    if (!target) return;
    const next = cloneFormation(formation);
    setSlot(next, target, { unitId: unit.id, track: null, order: null });
    setFormation(next);
    setActiveSlot(null);
  }

  function toggleTrack(ref: SlotRef, track: SkillTrack) {
    const next = cloneFormation(formation);
    const slot = getSlot(next, ref);
    if (!slot.unitId) return;

    if (slot.track === track) {
      slot.track = null;
      slot.order = null;
    } else {
      const orderedCount = allSlots(next).filter((s) => s.order != null).length;
      if (slot.order == null) {
        if (orderedCount >= MAX_ORDERED) {
          setError(`กำหนดลำดับสกิลได้สูงสุด ${MAX_ORDERED} ตัว`);
          return;
        }
        slot.order = orderedCount + 1;
      }
      slot.track = track;
    }
    renumber(next);
    setError(null);
    setFormation(next);
  }

  function clearSlot(ref: SlotRef) {
    const next = cloneFormation(formation);
    setSlot(next, ref, { unitId: null, track: null, order: null });
    renumber(next);
    setFormation(next);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, enemyType, formation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      onSaved(data.team as Team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-rose-500" />
            <h2 className="text-lg font-bold">เพิ่มทีมเป้าหมาย</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm text-gray-500">ชื่อทีม</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ทีมเคาน์เตอร์เวทย์"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-rose-300"
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-gray-500">ประเภททีมศัตรู</p>
            <EnemyTypeTabs value={enemyType} onChange={setEnemyType} />
          </div>

          {activeSlot && (
            <p className="text-sm font-medium text-rose-500">
              เลือกตัวละครจากด้านล่างเพื่อใส่ในช่องที่เลือก
            </p>
          )}

          <FormationGrid
            formation={formation}
            onPick={(ref) => setActiveSlot(ref)}
            onToggle={toggleTrack}
            onClear={clearSlot}
          />

          <CharacterPicker
            onPick={placeUnit}
            onOpenFullRoster={() => setShowRoster(true)}
          />

          <p className="text-xs leading-relaxed text-gray-400">
            ไม่จำเป็นต้องกรอกทุกช่อง — บันทึกได้เลย · เลือกตัวละคร/สัตว์เลี้ยงจากแถบด้านบน ·
            กด T (บน) / B (ล่าง) เพื่อกำหนดลำดับสกิล (สูงสุด 3) กดซ้ำเพื่อยกเลิก
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

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
