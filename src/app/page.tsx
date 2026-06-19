"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ENEMY_TYPES, EnemyType, Team } from "@/lib/types";
import { TeamBuilderModal } from "@/components/TeamBuilderModal";
import { TeamCard } from "@/components/TeamCard";

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<EnemyType | "all">("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
      setTeams(data.teams as Team[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
  }

  const visible =
    filter === "all" ? teams : teams.filter((t) => t.enemyType === filter);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">7k-เสือ</h1>
          <p className="text-sm text-gray-500">ตีกิลวอ</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/characters"
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            จัดการตัวละคร
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-600"
          >
            + เพิ่มทีมเป้าหมาย
          </button>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          ทั้งหมด
        </FilterChip>
        {ENEMY_TYPES.map((t) => (
          <FilterChip
            key={t.id}
            active={filter === t.id}
            color={t.color}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </FilterChip>
        ))}
      </div>

      {loading && <p className="text-gray-400">กำลังโหลด...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
          <br />
          ตรวจสอบว่าตั้งค่า <code>DATABASE_URL</code> และรัน <code>npm run db:init</code> แล้ว
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
          ยังไม่มีทีม — กด “เพิ่มทีมเป้าหมาย” เพื่อเริ่มต้น
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((t) => (
          <TeamCard key={t.id} team={t} onDelete={remove} />
        ))}
      </div>

      {open && (
        <TeamBuilderModal
          onClose={() => setOpen(false)}
          onSaved={(team) => {
            setTeams((prev) => [team, ...prev]);
            setOpen(false);
          }}
        />
      )}
    </main>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-4 py-1.5 text-sm font-medium transition"
      style={
        active
          ? {
              background: color ?? "#111827",
              color: "#fff",
              borderColor: color ?? "#111827",
            }
          : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }
      }
    >
      {children}
    </button>
  );
}
