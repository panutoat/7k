"use client";

import { useCallback, useEffect, useState } from "react";
import { LibraryDefense } from "@/lib/types";
import { FormationPreview } from "./FormationPreview";
import { LibraryEditModal } from "./LibraryEditModal";

/** Admin: pick a saved defense from the central library into the current war. */
export function LibraryPickerModal({
  warId,
  onClose,
  onAdded,
}: {
  warId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [library, setLibrary] = useState<LibraryDefense[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<LibraryDefense | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === library.length ? new Set() : new Set(library.map((e) => e.id))
    );
  }

  const load = useCallback(async () => {
    setBusy(true);
    const data = await fetch("/api/library").then((r) => r.json());
    setLibrary((data.library as LibraryDefense[]) ?? []);
    setBusy(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSelected() {
    const chosen = library.filter((e) => selected.has(e.id));
    if (chosen.length === 0) return;
    setAdding(true);
    for (const e of chosen) {
      await fetch(`/api/wars/${warId}/defenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: e.label,
          formation: e.formation,
          link: e.link,
          recommended: e.recommended ?? [],
        }),
      });
    }
    setAdding(false);
    onAdded();
  }

  async function remove(id: string) {
    if (!confirm("ลบออกจากคลัง?")) return;
    await fetch(`/api/library/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">คลังกลางทีมป้องกัน</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
          {busy ? (
            <p className="text-gray-400">กำลังโหลด...</p>
          ) : library.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              คลังว่าง — กด “บันทึกเข้าคลัง” ที่ทีมป้องกันเพื่อเก็บไว้ใช้ซ้ำ
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  คลิกการ์ดเพื่อเลือก (เลือกได้หลายทีม) แล้วกด “เพิ่มที่เลือก”
                </p>
                <button
                  onClick={toggleAll}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  {selected.size === library.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {library.map((e) => {
                  const on = selected.has(e.id);
                  return (
                    <div
                      key={e.id}
                      onClick={() => toggle(e.id)}
                      className={`cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition ${
                        on
                          ? "border-blue-400 ring-2 ring-blue-200"
                          : "border-gray-100 hover:border-blue-200"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 truncate text-sm font-semibold">
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                              on
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-gray-300 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          {e.label || "ไม่มีชื่อ"}
                          {(e.recommended?.length ?? 0) > 0 && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              ⭐ {e.recommended.length}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setEditing(e);
                            }}
                            className="text-xs text-gray-400 hover:text-rose-500"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              remove(e.id);
                            }}
                            className="text-xs text-gray-300 hover:text-red-500"
                          >
                            ลบ
                          </button>
                        </span>
                      </div>
                      <FormationPreview formation={e.formation} size={34} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-6 py-3">
          <span className="text-sm text-gray-500">เลือกแล้ว {selected.size} ทีม</span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium hover:bg-gray-50"
            >
              ปิด
            </button>
            <button
              onClick={addSelected}
              disabled={selected.size === 0 || adding}
              className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {adding ? "กำลังเพิ่ม..." : `เพิ่มที่เลือก (${selected.size})`}
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <LibraryEditModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
