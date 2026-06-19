"use client";

import { useMemo, useState } from "react";
import { Unit } from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { UnitTile } from "./UnitTile";

export function CharacterPicker({
  onPick,
  onOpenFullRoster,
}: {
  onPick: (unit: Unit) => void;
  onOpenFullRoster: () => void;
}) {
  const { units } = useUnits();
  const [kind, setKind] = useState<"character" | "pet">("character");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const source = units.filter((u) => u.kind === kind);
    const q = query.trim();
    return q === "" ? source : source.filter((u) => u.name.includes(q));
  }, [units, kind, query]);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Toggle active={kind === "character"} onClick={() => setKind("character")}>
          ตัวละคร
        </Toggle>
        <Toggle active={kind === "pet"} onClick={() => setKind("pet")}>
          สัตว์เลี้ยง
        </Toggle>
        <button
          type="button"
          onClick={onOpenFullRoster}
          className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          title="ดูตัวละครทั้งหมด"
        >
          ▦
        </button>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา..."
            className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-rose-300"
          />
        </div>
      </div>

      <div className="scroll-thin flex gap-1 overflow-x-auto pb-2">
        {list.length === 0 ? (
          <p className="px-2 py-6 text-sm text-gray-400">ไม่พบ</p>
        ) : (
          list.map((u) => <UnitTile key={u.id} unit={u} onClick={onPick} />)
        )}
      </div>
    </div>
  );
}

function Toggle({
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
