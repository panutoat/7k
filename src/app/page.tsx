"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { War } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";

export default function Home() {
  const { session, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [wars, setWars] = useState<War[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/wars");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "โหลดไม่สำเร็จ");
        setWars(data.wars as War[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      } finally {
        setBusy(false);
      }
    })();
  }, [session]);

  if (loading || !session) {
    return <main className="p-8 text-gray-400">กำลังโหลด...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader subtitle="เลือกกิลเป้าหมายเพื่อจัดทีมเข้าตี" />

      <div className="mb-5">
        <Link
          href="/library"
          className="inline-block rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
        >
          🛡️ ดูทีมป้องกันของกิลเรา
        </Link>
      </div>

      {busy && <p className="text-gray-400">กำลังโหลด...</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!busy && wars.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
          ยังไม่มีกิลเป้าหมาย
          {isAdmin && (
            <>
              {" "}— ไปที่{" "}
              <Link href="/admin" className="text-rose-500 underline">
                หน้าจัดการ
              </Link>{" "}
              เพื่อสร้าง
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {wars.map((w) => (
          <Link
            key={w.id}
            href={isAdmin ? `/admin/wars/${w.id}` : `/war/${w.id}`}
            className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-rose-200 hover:shadow"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-rose-500">
                ⚔
              </span>
              <h3 className="text-lg font-bold group-hover:text-rose-600">{w.name}</h3>
              {w.result && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                    w.result === "win" ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {w.result === "win" ? "WIN" : "LOSE"}
                </span>
              )}
              {!w.active && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                  ปิด
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {w.ourScore != null && w.enemyScore != null
                ? `แต้ม ${w.ourScore} - ${w.enemyScore}`
                : isAdmin
                ? "จัดการทีมป้องกัน + ติดตามการตี"
                : "กดเพื่อจัดทีมเข้าตี"}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
