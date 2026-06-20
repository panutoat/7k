"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, Category, Unit } from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { UnitTile } from "./UnitTile";

// "legend" is a pet-only tier — this character roster skips it.
const CHARACTER_CATEGORIES = CATEGORIES.filter((c) => c.id !== "legend");

export function FullRosterModal({
  onPick,
  onClose,
  excludeIds,
}: {
  onPick: (unit: Unit) => void;
  onClose: () => void;
  excludeIds?: Set<string>;
}) {
  const { units } = useUnits();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim();
    return units.filter(
      (u) =>
        u.kind === "character" &&
        !excludeIds?.has(u.id) &&
        (filter === "all" || u.category === filter) &&
        (q === "" || u.name.includes(q))
    );
  }, [units, query, filter, excludeIds]);

  const grouped = useMemo(() => {
    return CHARACTER_CATEGORIES.map((c) => ({
      cat: c,
      units: filtered.filter((u) => u.category === c.id),
    })).filter((g) => g.units.length > 0);
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:p-8">
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-blue-500" />
            <h2 className="text-lg font-bold">ตัวละครทั้งหมด</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-3 border-b px-6 py-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา..."
            className="w-full rounded-full border border-gray-200 px-5 py-2.5 outline-none focus:border-rose-300"
          />
          <div className="flex flex-wrap gap-2">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>
              ทั้งหมด
            </Chip>
            {CHARACTER_CATEGORIES.map((c) => (
              <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-4">
          {grouped.length === 0 && (
            <p className="py-10 text-center text-gray-400">ไม่พบตัวละคร</p>
          )}
          {grouped.map((g) => (
            <section key={g.cat.id} className="mb-6">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
                {g.cat.label}
              </h3>
              <div className="flex flex-wrap gap-1">
                {g.units.map((u) => (
                  <UnitTile key={u.id} unit={u} onClick={onPick} />
                ))}
              </div>
            </section>
          ))}
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
