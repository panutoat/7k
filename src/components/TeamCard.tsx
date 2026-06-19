"use client";

import { ENEMY_TYPES, Slot, Team } from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { Portrait } from "./Portrait";

function MiniSlot({ slot, line }: { slot: Slot; line: string }) {
  const { getUnit } = useUnits();
  const unit = getUnit(slot.unitId);
  if (!unit)
    return (
      <div className="h-11 w-11 rounded-lg border border-dashed border-gray-200 bg-gray-50" />
    );
  return (
    <div className="relative">
      <div className="rounded-lg p-[2px]" style={{ background: line }}>
        <Portrait unit={unit} size={40} />
      </div>
      {slot.order != null && (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-yellow-400 text-[10px] font-bold text-white">
          {slot.order}
        </span>
      )}
    </div>
  );
}

export function TeamCard({
  team,
  onDelete,
}: {
  team: Team;
  onDelete: (id: string) => void;
}) {
  const et = ENEMY_TYPES.find((t) => t.id === team.enemyType);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
            style={{ background: et?.color }}
          >
            {et?.label}
          </span>
          <h3 className="font-semibold">{team.name}</h3>
        </div>
        <button
          onClick={() => onDelete(team.id)}
          className="text-sm text-gray-300 hover:text-red-500"
          title="ลบทีม"
        >
          ลบ
        </button>
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {team.formation.back.map((s, i) => (
              <MiniSlot key={`b${i}`} slot={s} line="#ef6b78" />
            ))}
          </div>
          <div className="flex gap-1.5">
            {team.formation.front.map((s, i) => (
              <MiniSlot key={`f${i}`} slot={s} line="#7aa2f7" />
            ))}
          </div>
        </div>
        <div className="ml-auto">
          <MiniSlot slot={team.formation.pet} line="#c084fc" />
        </div>
      </div>
    </div>
  );
}
