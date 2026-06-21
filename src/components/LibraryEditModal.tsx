"use client";

import { useState } from "react";
import {
  Formation,
  LibraryDefense,
  RecommendedTemplate,
  emptyFormation,
} from "@/lib/types";
import { FormationEditor } from "./FormationEditor";
import { FormationPreview } from "./FormationPreview";

/** Admin: edit a saved defense template (and its recommended teams) in the library. */
export function LibraryEditModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: LibraryDefense;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(entry.label);
  const [link, setLink] = useState(entry.link ?? "");
  const [formation, setFormation] = useState<Formation>(entry.formation);
  const [recommended, setRecommended] = useState<RecommendedTemplate[]>(
    entry.recommended ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline editor for a single recommended team (null index = adding new).
  const [recEditing, setRecEditing] = useState<number | "new" | null>(null);
  const [recLabel, setRecLabel] = useState("");
  const [recLink, setRecLink] = useState("");
  const [recNote, setRecNote] = useState("");
  const [recFormation, setRecFormation] = useState<Formation>(emptyFormation());

  function startAddRec() {
    setRecLabel("");
    setRecLink("");
    setRecNote("");
    setRecFormation(emptyFormation());
    setRecEditing("new");
  }

  function startEditRec(i: number) {
    const r = recommended[i];
    setRecLabel(r.label);
    setRecLink(r.link ?? "");
    setRecNote(r.note ?? "");
    setRecFormation(r.formation);
    setRecEditing(i);
  }

  function saveRec() {
    const team: RecommendedTemplate = {
      label: recLabel.trim(),
      formation: recFormation,
      link: recLink.trim() || null,
      note: recNote.trim() || null,
    };
    setRecommended((prev) =>
      recEditing === "new"
        ? [...prev, team]
        : prev.map((r, i) => (i === recEditing ? team : r))
    );
    setRecEditing(null);
  }

  function removeRec(i: number) {
    setRecommended((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          formation,
          link: link.trim(),
          recommended,
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
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-blue-500" />
            <h2 className="text-lg font-bold">แก้ไขทีมในคลัง</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-6 py-5">
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
            <label className="mb-1 block text-sm text-gray-500">ลิงก์ 7k-combo (ถ้ามี)</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="วางลิงก์ทีมจาก 7k-combo"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            />
          </div>
          <FormationEditor value={formation} onChange={setFormation} />

          {/* Recommended attack teams carried with this library entry */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-700">
                ⭐ ทีมแนะนำสำหรับตีบ้านนี้ ({recommended.length})
              </p>
              {recEditing === null && (
                <button
                  onClick={startAddRec}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  + เพิ่มทีมแนะนำ
                </button>
              )}
            </div>

            {recommended.length === 0 && recEditing === null ? (
              <p className="text-xs text-gray-400">ยังไม่มีทีมแนะนำ</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-amber-200 bg-white p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-amber-700">
                        ⭐ {t.label || "ทีมแนะนำ"}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => startEditRec(i)}
                          className="text-xs text-gray-400 hover:text-rose-500"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => removeRec(i)}
                          className="text-xs text-gray-300 hover:text-red-500"
                        >
                          ลบ
                        </button>
                      </span>
                    </div>
                    <FormationPreview formation={t.formation} size={30} />
                  </div>
                ))}
              </div>
            )}

            {recEditing !== null && (
              <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <input
                    value={recLabel}
                    onChange={(e) => setRecLabel(e.target.value)}
                    placeholder="ชื่อทีมแนะนำ (ไม่บังคับ)"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                  />
                  <input
                    value={recLink}
                    onChange={(e) => setRecLink(e.target.value)}
                    placeholder="ลิงก์ 7k-combo (ถ้ามี)"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                  />
                </div>
                <textarea
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                  rows={2}
                  placeholder="โน้ต/คำอธิบาย (สมาชิกเห็นเป็น tooltip)"
                  className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                />
                <FormationEditor value={recFormation} onChange={setRecFormation} />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setRecEditing(null)}
                    className="rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={saveRec}
                    className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    {recEditing === "new" ? "เพิ่มทีมแนะนำ" : "บันทึกการแก้ไข"}
                  </button>
                </div>
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
