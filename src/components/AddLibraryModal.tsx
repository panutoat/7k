"use client";

import { useState } from "react";
import { Formation, emptyFormation } from "@/lib/types";
import { FormationEditor } from "./FormationEditor";

/** Admin: create a new defense template directly in the central library. */
export function AddLibraryModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [formation, setFormation] = useState<Formation>(emptyFormation());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          formation,
          note: note.trim(),
          recommended: [],
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-blue-500" />
            <h2 className="text-lg font-bold">เพิ่มทีมเข้าคลัง</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm text-gray-500">ป้ายชื่อ</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ไม่บังคับ"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-500">รายละเอียด</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="คำอธิบายทีม (สมาชิกเห็นตอนกดดูการ์ด)"
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
