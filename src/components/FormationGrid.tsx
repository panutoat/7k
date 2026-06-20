"use client";

import { Formation, SkillTrack, Slot } from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { Portrait, Stars } from "./Portrait";

export type SlotRef =
  | { row: "back" | "front"; index: number }
  | { row: "pet"; index: 0 };

function slotKey(ref: SlotRef) {
  return `${ref.row}-${ref.index}`;
}

function SlotCell({
  slot,
  refObj,
  lineColor,
  onPick,
  onToggle,
  onClear,
  onSwap,
}: {
  slot: Slot;
  refObj: SlotRef;
  lineColor: string;
  onPick: (ref: SlotRef) => void;
  onToggle: (ref: SlotRef, track: SkillTrack) => void;
  onClear: (ref: SlotRef) => void;
  onSwap: (a: SlotRef, b: SlotRef) => void;
}) {
  const { getUnit } = useUnits();
  const unit = getUnit(slot.unitId);
  const canDrag = !!unit && refObj.row !== "pet";
  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onPick(refObj)}
          draggable={canDrag}
          onDragStart={(e) =>
            e.dataTransfer.setData("text/plain", JSON.stringify(refObj))
          }
          onDragOver={(e) => {
            if (refObj.row !== "pet") e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (refObj.row === "pet") return;
            try {
              const src = JSON.parse(
                e.dataTransfer.getData("text/plain")
              ) as SlotRef;
              if (src) onSwap(src, refObj);
            } catch {
              /* ignore */
            }
          }}
          className="relative grid h-[88px] w-[78px] place-items-center rounded-2xl border-2 border-dashed border-rose-300 bg-white transition hover:border-rose-400"
          style={unit ? { borderStyle: "solid", borderColor: lineColor } : {}}
        >
          {unit ? (
            <>
              <Portrait unit={unit} size={70} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear(refObj);
                }}
                className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gray-700 text-xs text-white"
                aria-label="ลบ"
              >
                ×
              </button>
            </>
          ) : (
            <span className="text-3xl font-light text-rose-400">+</span>
          )}
        </button>
        <span className="mt-1 max-w-[78px] truncate text-xs text-gray-600">
          {unit ? unit.name : "ว่าง"}
        </span>
      </div>

      {/* T / B skill-order toggles — heroes only (pets have no skill order). */}
      {refObj.row !== "pet" && (
        <div className="flex flex-col gap-1">
          {(["T", "B"] as SkillTrack[]).map((track) => {
            const orderNo = track === "T" ? slot.top : slot.bottom;
            const active = orderNo != null;
            return (
              <button
                key={track}
                type="button"
                disabled={!unit}
                onClick={() => onToggle(refObj, track)}
                className="relative grid h-6 w-6 place-items-center rounded-full border text-xs font-bold transition disabled:opacity-30"
                style={
                  active
                    ? { background: lineColor, color: "#fff", borderColor: lineColor }
                    : { background: "#fff", color: "#6b7280", borderColor: "#d1d5db" }
                }
                title={track === "T" ? "สกิลบน" : "สกิลล่าง"}
              >
                {track}
                {active && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-yellow-400 text-[9px] font-bold text-white">
                    {orderNo}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FormationGrid({
  formation,
  onPick,
  onToggle,
  onClear,
  onSwap,
}: {
  formation: Formation;
  onPick: (ref: SlotRef) => void;
  onToggle: (ref: SlotRef, track: SkillTrack) => void;
  onClear: (ref: SlotRef) => void;
  onSwap: (a: SlotRef, b: SlotRef) => void;
}) {
  const back = "#ef6b78";
  const front = "#7aa2f7";

  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-6">
        {/* Hero formation */}
        <div className="flex flex-col gap-6">
          {/* Back row */}
          <div className="relative flex items-center gap-3">
            <div className="flex gap-3">
              {formation.back.map((slot, i) => (
                <SlotCell
                  key={slotKey({ row: "back", index: i })}
                  slot={slot}
                  refObj={{ row: "back", index: i }}
                  lineColor={back}
                  onPick={onPick}
                  onToggle={onToggle}
                  onClear={onClear}
                  onSwap={onSwap}
                />
              ))}
            </div>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: back }}
            >
              B
            </span>
          </div>

          {/* Front row */}
          <div className="relative flex items-center gap-3">
            <div className="flex gap-3">
              {formation.front.map((slot, i) => (
                <SlotCell
                  key={slotKey({ row: "front", index: i })}
                  slot={slot}
                  refObj={{ row: "front", index: i }}
                  lineColor={front}
                  onPick={onPick}
                  onToggle={onToggle}
                  onClear={onClear}
                  onSwap={onSwap}
                />
              ))}
            </div>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: front }}
            >
              F
            </span>
          </div>
        </div>

        {/* Pet slot */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-gray-400">สัตว์เลี้ยง</span>
          <SlotCell
            slot={formation.pet}
            refObj={{ row: "pet", index: 0 }}
            lineColor="#c084fc"
            onPick={onPick}
            onToggle={onToggle}
            onClear={onClear}
            onSwap={onSwap}
          />
        </div>
      </div>
    </div>
  );
}

export { Stars };
