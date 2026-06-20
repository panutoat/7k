"use client";

import { Formation, FORMATION_TYPES, Slot } from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { Portrait } from "./Portrait";

function typeLabel(t: Formation["type"]): string {
  return FORMATION_TYPES.find((x) => x.id === (t ?? "basic"))?.label ?? "พื้นฐาน";
}

function MiniSlot({ slot, line, size = 40 }: { slot: Slot; line: string; size?: number }) {
  const { getUnit } = useUnits();
  const unit = getUnit(slot.unitId);
  if (!unit)
    return (
      <div
        className="rounded-lg border border-dashed border-gray-200 bg-gray-50"
        style={{ width: size, height: size }}
      />
    );
  return (
    <div className="relative">
      <div className="rounded-lg p-[2px]" style={{ background: line }}>
        <Portrait unit={unit} size={size} />
      </div>
      {slot.top != null && (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-yellow-400 text-[10px] font-bold text-white">
          {slot.top}
        </span>
      )}
      {slot.bottom != null && (
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-sky-400 text-[10px] font-bold text-white">
          {slot.bottom}
        </span>
      )}
    </div>
  );
}

/** Compact, read-only render of a formation (back row, front row, pet). */
export function FormationPreview({
  formation,
  size = 40,
  showType = true,
}: {
  formation: Formation;
  size?: number;
  showType?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {showType && (
        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          {typeLabel(formation.type)}
        </span>
      )}
      <div className="flex items-end gap-4">
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            {formation.back.map((s, i) => (
              <MiniSlot key={`b${i}`} slot={s} line="#ef6b78" size={size} />
            ))}
          </div>
          <div className="flex gap-1.5">
            {formation.front.map((s, i) => (
              <MiniSlot key={`f${i}`} slot={s} line="#7aa2f7" size={size} />
            ))}
          </div>
        </div>
        <MiniSlot slot={formation.pet} line="#c084fc" size={size} />
      </div>
    </div>
  );
}
