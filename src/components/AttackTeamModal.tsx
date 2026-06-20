"use client";

import { useState } from "react";
import {
  AttackTeam,
  DefenseTeam,
  Formation,
  emptyFormation,
} from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { FormationEditor } from "./FormationEditor";
import { FormationPreview } from "./FormationPreview";

/** Build/edit one of a member's attack teams (a single slot). */
export function AttackTeamModal({
  warId,
  slot,
  existing,
  blockedUnitIds,
  defenses,
  onClose,
  onSaved,
}: {
  warId: string;
  slot: number;
  existing: AttackTeam | null;
  /** Heroes already used by this member's other slots. */
  blockedUnitIds: Set<string>;
  defenses: DefenseTeam[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getUnit } = useUnits();
  const [formation, setFormation] = useState<Formation>(
    existing?.formation ?? emptyFormation()
  );
  const [targetId, setTargetId] = useState<string | null>(
    existing?.targetDefenseId ?? null
  );
  const [done, setDone] = useState(existing?.done ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  async function save() {
    setSaving(true);
    setError(null);
    setConflicts([]);
    try {
      const res = await fetch(`/api/wars/${warId}/attacks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          formation,
          targetDefenseId: targetId,
          done,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.conflicts)) setConflicts(data.conflicts as string[]);
        throw new Error(data.error || "บันทึกไม่สำเร็จ");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  const target = defenses.find((d) => d.id === targetId) ?? null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-rose-500" />
            <h2 className="text-lg font-bold">ทีมโจมตี #{slot}</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm text-gray-500">ตีทีมป้องกัน (ถ้ามี)</label>
            <select
              value={targetId ?? ""}
              onChange={(e) => setTargetId(e.target.value || null)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            >
              <option value="">— ไม่ระบุ —</option>
              {defenses.map((d, i) => (
                <option key={d.id} value={d.id}>
                  ป้องกัน #{i + 1}
                  {d.label ? ` · ${d.label}` : ""}
                </option>
              ))}
            </select>
            {target && (
              <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <FormationPreview formation={target.formation} size={36} />
              </div>
            )}
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              ตัวละครที่ซ้ำกับทีมอื่น:{" "}
              <b>{conflicts.map((id) => getUnit(id)?.name ?? id).join(", ")}</b>
            </div>
          )}

          <FormationEditor
            value={formation}
            onChange={setFormation}
            blockedUnitIds={blockedUnitIds}
          />

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => setDone(e.target.checked)}
              className="h-4 w-4 accent-rose-500"
            />
            ตีไปแล้ว
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

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
    </div>
  );
}
