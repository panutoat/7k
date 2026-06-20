"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, Unit } from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { useAuth } from "@/lib/auth-context";
import { Portrait, Stars } from "@/components/Portrait";
import { UnitEditorModal } from "@/components/UnitEditorModal";

export default function CharactersAdminPage() {
  const { units, loading, error, reload } = useUnits();
  const { loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [editor, setEditor] = useState<{ unit: Unit | null } | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/login");
  }, [authLoading, isAdmin, router]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return q === "" ? units : units.filter((u) => u.name.includes(q));
  }, [units, query]);

  // Split into Characters vs Pets first, then by category within each.
  const sections = useMemo(() => {
    const groupsFor = (kind: Unit["kind"]) =>
      CATEGORIES.map((c) => ({
        cat: c,
        units: filtered.filter((u) => u.kind === kind && u.category === c.id),
      })).filter((g) => g.units.length > 0);
    return [
      { id: "character", title: "ตัวละคร", groups: groupsFor("character") },
      { id: "pet", title: "สัตว์เลี้ยง", groups: groupsFor("pet") },
    ].filter((s) => s.groups.length > 0);
  }, [filtered]);

  async function remove(u: Unit) {
    if (!confirm(`ลบ "${u.name}" ?`)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/units/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ลบไม่สำเร็จ");
      }
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">
            ← กลับหน้าจัดการ
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">จัดการตัวละคร</h1>
          <p className="text-sm text-gray-500">
            เพิ่ม/แก้ไข/ลบ ตัวละครและสัตว์เลี้ยง พร้อมรูปประจำตัว
          </p>
        </div>
        <button
          onClick={() => setEditor({ unit: null })}
          className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-600"
        >
          + เพิ่มตัวละคร
        </button>
      </header>

      <div className="mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาตัวละคร..."
          className="w-full max-w-sm rounded-full border border-gray-200 px-5 py-2.5 outline-none focus:border-rose-300"
        />
      </div>

      {loading && <p className="text-gray-400">กำลังโหลด...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && sections.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
          ยังไม่มีตัวละคร — กด “เพิ่มตัวละคร”
        </div>
      )}

      <div className="space-y-10">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`h-5 w-1.5 rounded ${
                  section.id === "pet" ? "bg-violet-500" : "bg-rose-500"
                }`}
              />
              <h2 className="text-xl font-extrabold">{section.title}</h2>
            </div>
            <div className="space-y-7">
              {section.groups.map((g) => (
                <section key={`${section.id}-${g.cat.id}`}>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">
                    {g.cat.label}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.units.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                      >
                        <div className="rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 p-[2px]">
                          <Portrait unit={u} size={56} />
                          <Stars count={u.stars} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{u.name}</p>
                          <p className="text-xs text-gray-400">
                            {u.kind === "pet" ? "สัตว์เลี้ยง" : "ตัวละคร"} · {u.stars}★
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setEditor({ unit: u })}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => remove(u)}
                            disabled={busyId === u.id}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editor && (
        <UnitEditorModal
          initial={editor.unit}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await reload();
          }}
        />
      )}
    </main>
  );
}
