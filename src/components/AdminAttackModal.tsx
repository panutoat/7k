"use client";

import { useState } from "react";
import { AttackTeam, DefenseTeam } from "@/lib/types";
import { FormationPreview } from "./FormationPreview";

/**
 * Admin marks a member's attack slot as done and/or pairs it with a defense —
 * useful when a member attacked in-game but didn't fill the web. Works whether
 * or not the member has actually built the team (formation may be empty).
 */
export function AdminAttackModal({
  warId,
  memberId,
  memberName,
  slot,
  existing,
  defenses,
  onClose,
  onSaved,
}: {
  warId: string;
  memberId: string;
  memberName: string;
  slot: number;
  existing: AttackTeam | null;
  defenses: DefenseTeam[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [done, setDone] = useState(existing?.done ?? false);
  const [targetId, setTargetId] = useState<string | null>(
    existing?.targetDefenseId ?? null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Reuse the upsert endpoint (admin may pass memberId). Keep any existing
      // formation untouched by re-sending it.
      const res = await fetch(`/api/wars/${warId}/attacks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          slot,
          formation: existing?.formation ?? null,
          targetDefenseId: targetId,
          done,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
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
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">
            {memberName} · ทีม #{slot}
          </h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {existing?.formation ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <FormationPreview formation={existing.formation} size={36} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">สมาชิกยังไม่ได้กรอกทีมในเว็บ</p>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => setDone(e.target.checked)}
              className="h-4 w-4 accent-rose-500"
            />
            ตีไปแล้ว
          </label>

          <div>
            <label className="mb-1 block text-sm text-gray-500">จับคู่ทีมป้องกัน</label>
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
                <FormationPreview formation={target.formation} size={32} />
              </div>
            )}
          </div>

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
