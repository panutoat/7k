"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DefenseTeam,
  Formation,
  RecommendedTeam,
  emptyFormation,
} from "@/lib/types";
import { FormationEditor } from "./FormationEditor";
import { FormationPreview } from "./FormationPreview";

/** Admin: manage recommended attack teams for beating a defense. */
export function RecommendModal({
  defense,
  index,
  onClose,
}: {
  defense: DefenseTeam;
  index: number;
  onClose: () => void;
}) {
  const [list, setList] = useState<RecommendedTeam[]>([]);
  const [busy, setBusy] = useState(true);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [formation, setFormation] = useState<Formation>(emptyFormation());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    const data = await fetch(`/api/defenses/${defense.id}/recommended`).then((r) =>
      r.json()
    );
    setList((data.recommended as RecommendedTeam[]) ?? []);
    setBusy(false);
  }, [defense.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    setError(null);
    const res = await fetch(`/api/defenses/${defense.id}/recommended`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim(),
        formation,
        link: link.trim(),
        note: note.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "บันทึกไม่สำเร็จ");
    setLabel("");
    setLink("");
    setNote("");
    setFormation(emptyFormation());
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("ลบทีมแนะนำนี้?")) return;
    await fetch(`/api/recommended/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">
            ⭐ ทีมแนะนำสำหรับตี ป้องกัน #{index}
            {defense.label ? ` · ${defense.label}` : ""}
          </h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-1 text-xs font-semibold text-gray-500">ทีมป้องกันเป้าหมาย</p>
            <FormationPreview formation={defense.formation} size={32} />
          </div>

          {busy ? (
            <p className="text-gray-400">กำลังโหลด...</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีทีมแนะนำ</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-amber-700">
                      ⭐ {t.label || "ทีมแนะนำ"}
                    </span>
                    <button
                      onClick={() => remove(t.id)}
                      className="text-xs text-gray-300 hover:text-red-500"
                    >
                      ลบ
                    </button>
                  </div>
                  <FormationPreview formation={t.formation} size={30} />
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ชื่อทีมแนะนำ (ไม่บังคับ)"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                />
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="ลิงก์ 7k-combo (ถ้ามี)"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                />
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="โน้ต/คำอธิบาย (สมาชิกเห็นเป็น tooltip)"
                className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
              <FormationEditor value={formation} onChange={setFormation} />
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setAdding(false)}
                  className="rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={add}
                  className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  บันทึกทีมแนะนำ
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              + เพิ่มทีมแนะนำ
            </button>
          )}
        </div>

        <div className="flex justify-end border-t px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
