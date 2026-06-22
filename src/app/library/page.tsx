"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { LibraryDefense } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { FormationPreview } from "@/components/FormationPreview";
import { AddLibraryModal } from "@/components/AddLibraryModal";
import { LibraryEditModal } from "@/components/LibraryEditModal";
import { LibraryDetailModal } from "@/components/LibraryDetailModal";

export default function LibraryPage() {
  const { session, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryDefense[]>([]);
  const [busy, setBusy] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LibraryDefense | null>(null);
  const [detail, setDetail] = useState<LibraryDefense | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  const load = useCallback(async () => {
    setBusy(true);
    const data = await fetch("/api/library").then((r) => r.json());
    setLibrary((data.library as LibraryDefense[]) ?? []);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (loading || !session) {
    return <main className="p-8 text-gray-400">กำลังโหลด...</main>;
  }

  const chosen = library
    .filter((e) => e.defenseRank != null)
    .sort((a, b) => (a.defenseRank ?? 0) - (b.defenseRank ?? 0));
  const maxRank = chosen.reduce((m, e) => Math.max(m, e.defenseRank ?? 0), 0);

  async function setRank(id: string, rank: number | null) {
    await fetch(`/api/library/${id}/rank`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rank }),
    });
    load();
  }

  async function move(i: number, dir: -1 | 1) {
    const a = chosen[i];
    const b = chosen[i + dir];
    if (!a || !b) return;
    // swap ranks
    await fetch(`/api/library/${a.id}/rank`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rank: b.defenseRank }),
    });
    await fetch(`/api/library/${b.id}/rank`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rank: a.defenseRank }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("ลบทีมนี้ออกจากคลัง?")) return;
    await fetch(`/api/library/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AppHeader subtitle="คลังกิล + ทีมป้องกันของกิลเรา" />
      <Link
        href={isAdmin ? "/admin" : "/"}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← กลับ
      </Link>

      {/* OUR guild's chosen defense lineup (ranked 1..n) */}
      <section className="mt-6">
        <h2 className="mb-1 text-lg font-bold">🛡️ ทีมป้องกันของกิลเรา (เรียงลำดับ)</h2>
        <p className="mb-3 text-sm text-gray-400">
          {isAdmin
            ? "เลือกจากคลังด้านล่างเพื่อตั้งให้สมาชิกใช้ป้องกัน เรียง 1 → n"
            : "ทีมที่แอดมินแนะนำให้ใช้ตั้งป้องกัน (เรียงตามความสำคัญ)"}
        </p>
        {chosen.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            ยังไม่ได้เลือกทีมป้องกัน
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chosen.map((e, i) => (
              <div
                key={e.id}
                onClick={() => setDetail(e)}
                className="relative cursor-pointer rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-4 transition hover:border-emerald-400"
                title="คลิกดูรายละเอียด"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 truncate font-semibold">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {e.label || "ไม่มีชื่อ"}
                    {e.recommended.length > 0 && (
                      <span className="text-xs text-amber-500">
                        ⭐{e.recommended.length}
                      </span>
                    )}
                  </span>
                  {isAdmin && (
                    <span
                      className="flex shrink-0 items-center gap-1"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded border border-gray-200 px-1.5 text-xs disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === chosen.length - 1}
                        className="rounded border border-gray-200 px-1.5 text-xs disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setRank(e.id, null)}
                        className="text-xs text-gray-300 hover:text-red-500"
                      >
                        เอาออก
                      </button>
                    </span>
                  )}
                </div>
                <FormationPreview formation={e.formation} size={32} />
                <p className="mt-2 text-[11px] text-emerald-600">แตะเพื่อดูรายละเอียด →</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full library */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">คลังทีมทั้งหมด ({library.length})</h2>
          {isAdmin && (
            <button
              onClick={() => setAdding(true)}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              + เพิ่มทีม
            </button>
          )}
        </div>
        {busy ? (
          <p className="text-gray-400">กำลังโหลด...</p>
        ) : library.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            คลังว่าง
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((e) => (
              <div
                key={e.id}
                onClick={() => setDetail(e)}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-rose-200"
                title="คลิกดูรายละเอียด"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {e.label || "ไม่มีชื่อ"}
                    {e.recommended.length > 0 && (
                      <span className="ml-1 text-xs text-amber-500">
                        ⭐{e.recommended.length}
                      </span>
                    )}
                  </span>
                  {isAdmin && (
                    <span
                      className="flex shrink-0 items-center gap-2"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <button
                        onClick={() => setEditing(e)}
                        className="text-xs text-gray-400 hover:text-rose-500"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => remove(e.id)}
                        className="text-xs text-gray-300 hover:text-red-500"
                      >
                        ลบ
                      </button>
                    </span>
                  )}
                </div>
                <FormationPreview formation={e.formation} size={32} />
                {isAdmin &&
                  (e.defenseRank == null ? (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setRank(e.id, maxRank + 1);
                      }}
                      className="mt-3 w-full rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                    >
                      + เลือกใช้ป้องกัน
                    </button>
                  ) : (
                    <p className="mt-3 text-center text-xs font-semibold text-emerald-600">
                      ✓ อยู่ในทีมป้องกันแล้ว
                    </p>
                  ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {detail && (
        <LibraryDetailModal entry={detail} onClose={() => setDetail(null)} />
      )}
      {adding && (
        <AddLibraryModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {editing && (
        <LibraryEditModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </main>
  );
}
