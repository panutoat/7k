"use client";

import { Unit } from "@/lib/types";
import { Portrait } from "./Portrait";

export function UnitTile({
  unit,
  onClick,
  size = 64,
}: {
  unit: Unit;
  onClick: (unit: Unit) => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(unit)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", `unit:${unit.id}`)}
      className="flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 transition hover:bg-rose-50"
      title={unit.name}
    >
      <div>
        <Portrait unit={unit} size={size} />
      </div>
      <span className="max-w-[80px] truncate text-xs text-gray-600">
        {unit.name}
      </span>
    </button>
  );
}
