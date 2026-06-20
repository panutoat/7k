"use client";

import { useState } from "react";
import { DefenseTeam, Formation, emptyFormation } from "@/lib/types";
import { FormationEditor } from "./FormationEditor";

/** Admin: add or edit an enemy defense team. */
export function DefenseModal({
  warId,
  initial,
  onClose,
  onSaved,
}: {
  warId: string;
  /** Existing defense to edit, or undefined to create a new one. */
  initial?: DefenseTeam;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [formation, setFormation] = useState<Formation>(
    initial?.formation ?? emptyFormation()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        initial ? `/api/defenses/${initial.id}` : `/api/wars/${warId}/defenses`,
        {
          method: initial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: label.trim(), formation, link: link.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-blue-500" />
            <h2 className="text-lg font-bold">
              {initial ? "แก้ไขทีมป้องกัน" : "เพิ่มทีมป้องกัน"}
            </h2>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm text-gray-500">ป้ายชื่อ (เช่น เจ้าของทีม / โน้ต)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ไม่บังคับ"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-500">
              ลิงก์ 7k-combo (ถ้ามี)
            </label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="วางลิงก์ทีมจาก 7k-combo"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            />
          </div>
          <FormationEditor value={formation} onChange={setFormation} />
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
