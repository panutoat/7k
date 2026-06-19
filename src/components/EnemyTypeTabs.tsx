"use client";

import { ENEMY_TYPES, EnemyType } from "@/lib/types";

export function EnemyTypeTabs({
  value,
  onChange,
}: {
  value: EnemyType;
  onChange: (v: EnemyType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ENEMY_TYPES.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="rounded-full border px-4 py-1.5 text-sm font-medium transition"
            style={
              active
                ? { borderColor: t.color, color: t.color, background: "#fff", boxShadow: `inset 0 0 0 1px ${t.color}` }
                : { borderColor: "#e5e7eb", color: "#6b7280", background: "#fff" }
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
