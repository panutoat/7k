"use client";

import { Unit } from "@/lib/types";
import { Portrait, Stars } from "./Portrait";

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
      className="flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 transition hover:bg-rose-50"
      title={unit.name}
    >
      <div className="rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 p-[3px]">
        <Portrait unit={unit} size={size} />
        <Stars count={unit.stars} />
      </div>
      <span className="max-w-[80px] truncate text-xs text-gray-600">
        {unit.name}
      </span>
    </button>
  );
}
