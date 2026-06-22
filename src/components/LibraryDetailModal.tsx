"use client";

import { FORMATION_TYPES, LibraryDefense } from "@/lib/types";
import { FormationPreview } from "./FormationPreview";

/** Read-only detail view of a library defense team + its recommended teams. */
export function LibraryDetailModal({
  entry,
  onClose,
}: {
  entry: LibraryDefense;
  onClose: () => void;
}) {
  const typeLabel =
    FORMATION_TYPES.find((t) => t.id === (entry.formation.type ?? "basic"))?.label ??
    "พื้นฐาน";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">{entry.label || "ทีมป้องกัน"}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <span className="mb-2 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              {typeLabel}
            </span>
            <FormationPreview formation={entry.formation} size={48} showType={false} />
            {entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-blue-500 hover:underline"
              >
                🔗 เปิดใน 7k-combo
              </a>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-amber-600">
              ⭐ ทีมแนะนำสำหรับตีบ้านนี้ ({entry.recommended.length})
            </p>
            {entry.recommended.length === 0 ? (
              <p className="text-sm text-gray-400">ยังไม่มีทีมแนะนำ</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {entry.recommended.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3"
                    title={t.note || undefined}
                  >
                    <p className="mb-1 flex items-center gap-1 truncate text-xs font-semibold text-amber-700">
                      <span className="truncate">⭐ {t.label || "ทีมแนะนำ"}</span>
                      {t.note && <span title={t.note}>📝</span>}
                    </p>
                    <FormationPreview formation={t.formation} size={30} showType={false} />
                    {t.note && (
                      <p className="mt-1 text-[11px] text-gray-500">{t.note}</p>
                    )}
                    {t.link && (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-[11px] font-medium text-blue-500 hover:underline"
                      >
                        🔗 7k-combo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
