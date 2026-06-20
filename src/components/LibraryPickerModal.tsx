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

  const load = useCallback(async () => {
    setBusy(true);
    const data = await fetch("/api/library").then((r) => r.json());
    setLibrary((data.library as LibraryDefense[]) ?? []);
    setBusy(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function use(e: LibraryDefense) {
    await fetch(`/api/wars/${warId}/defenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: e.label, formation: e.formation, link: e.link }),
    });
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {library.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {e.label || "ไม่มีชื่อ"}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => setEditing(e)}
                        className="text-xs text-gray-400 hover:text-rose-500"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => remove(e.id)}
                        className="text-xs text-gray-300 hover:text-red-500"
                      >
                        ลบ
                      </button>
                    </span>
                  </div>
                  <FormationPreview formation={e.formation} size={34} />
                  <button
                    onClick={() => use(e)}
                    className="mt-3 w-full rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                  >
                    ใช้ทีมนี้
                  </button>
                </div>
              ))}
            </div>
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
