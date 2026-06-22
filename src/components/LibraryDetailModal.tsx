"use client";

import {
  FORMATION_TYPES,
  LibraryDefense,
  RINGS,
  Slot,
} from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { FormationPreview } from "./FormationPreview";

/** Read-only detail view of a library defense team — formation + ring info. */
export function LibraryDetailModal({
  entry,
  onClose,
}: {
  entry: LibraryDefense;
  onClose: () => void;
}) {
  const { getUnit } = useUnits();
  const typeLabel =
    FORMATION_TYPES.find((t) => t.id === (entry.formation.type ?? "basic"))?.label ??
    "พื้นฐาน";

  // Heroes (back + front) that have rings.
  const heroes = [...entry.formation.back, ...entry.formation.front].filter(
    (s): s is Slot => !!s.unitId && (s.rings?.length ?? 0) > 0
  );

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
            <p className="mb-2 text-sm font-semibold text-gray-600">💍 แหวน</p>
            {heroes.length === 0 ? (
              <p className="text-sm text-gray-400">ไม่มีแหวน</p>
            ) : (
              <ul className="space-y-2">
                {heroes.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2"
                  >
                    <span className="min-w-[80px] font-medium">
                      {getUnit(s.unitId)?.name ?? s.unitId}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {RINGS.filter((r) => s.rings?.includes(r.id)).map((r) => (
                        <span
                          key={r.id}
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ background: r.color }}
                        >
                          {r.label}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
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
