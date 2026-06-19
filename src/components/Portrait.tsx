import { Unit } from "@/lib/types";

/**
 * Placeholder portrait: a colored gradient derived from the unit's hue plus its
 * initials. Replace with a real <img> once you have artwork (see README).
 */
export function Portrait({
  unit,
  size = 64,
  rounded = true,
}: {
  unit: Unit;
  size?: number;
  rounded?: boolean;
}) {
  if (unit.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={unit.image}
        alt={unit.name}
        width={size}
        height={size}
        className={`object-cover select-none ${rounded ? "rounded-lg" : ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const bg = `linear-gradient(135deg, hsl(${unit.hue} 75% 62%), hsl(${
    (unit.hue + 40) % 360
  } 70% 45%))`;
  const initials = unit.name.slice(0, 2);
  return (
    <div
      className={`flex items-center justify-center font-bold text-white select-none ${
        rounded ? "rounded-lg" : ""
      }`}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.34,
        textShadow: "0 1px 3px rgba(0,0,0,0.35)",
      }}
    >
      {initials}
    </div>
  );
}

export function Stars({ count }: { count: number }) {
  return (
    <div className="text-[8px] leading-none tracking-tighter text-yellow-400">
      {"★".repeat(count)}
    </div>
  );
}
