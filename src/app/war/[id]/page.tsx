"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  ATTACK_SLOTS,
  AttackTeam,
  DefenseTeam,
  War,
  formationUnitIds,
} from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { FormationPreview } from "@/components/FormationPreview";
import { AttackTeamModal } from "@/components/AttackTeamModal";

export default function MemberWarPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading, isAdmin } = useAuth();
  const router = useRouter();

  const [war, setWar] = useState<War | null>(null);
  const [defenses, setDefenses] = useState<DefenseTeam[]>([]);
  const [attacks, setAttacks] = useState<AttackTeam[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editSlot, setEditSlot] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (isAdmin) router.replace(`/admin/wars/${id}`);
  }, [loading, session, isAdmin, id, router]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [w, d, a] = await Promise.all([
        fetch(`/api/wars/${id}`).then((r) => r.json()),
        fetch(`/api/wars/${id}/defenses`).then((r) => r.json()),
        fetch(`/api/wars/${id}/attacks`).then((r) => r.json()),
      ]);
      if (w.error) throw new Error(w.error);
      setWar(w.war as War);
      setDefenses((d.defenses as DefenseTeam[]) ?? []);
      setAttacks((a.attacks as AttackTeam[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    if (session && !isAdmin) load();
  }, [session, isAdmin, load]);

  if (loading || !session || isAdmin) {
    return <main className="p-8 text-gray-400">กำลังโหลด...</main>;
  }

  const myAttacks = attacks.filter((a) => a.memberId === session.memberId);
  const bySlot = (slot: number) => myAttacks.find((a) => a.slot === slot) ?? null;

  function blockedUnitIds(excludeSlot: number): Set<string> {
    const set = new Set<string>();
    for (const a of myAttacks) {
      if (a.slot === excludeSlot || !a.formation) continue;
      for (const uid of formationUnitIds(a.formation)) set.add(uid);
    }
    return set;
  }

  async function clearSlot(attackId: string) {
    if (!confirm("ลบทีมนี้?")) return;
    await fetch(`/api/attacks/${attackId}`, { method: "DELETE" });
    load();
  }

  // 8.1: mark result straight from the summary (toggle off if same).
  async function setResult(atk: AttackTeam, result: "win" | "loss") {
    const next = atk.result === result ? null : result;
    await fetch(`/api/attacks/${atk.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: next, done: next != null }),
    });
    load();
  }

  const usedCount = myAttacks.filter((a) => a.formation).length;
  const doneCount = myAttacks.filter((a) => a.done).length;
  const winCount = myAttacks.filter((a) => a.result === "win").length;
  const lossCount = myAttacks.filter((a) => a.result === "loss").length;
  const locked = !!war?.locked;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader subtitle={war ? `ตีกิล: ${war.name}` : undefined} />

      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← กลับ
        </Link>
        <span className="text-sm text-gray-500">
          จัดแล้ว {usedCount}/{ATTACK_SLOTS} · ตีแล้ว {doneCount} ·{" "}
          <span className="font-semibold text-green-600">ชนะ {winCount}</span> ·{" "}
          <span className="font-semibold text-red-500">แพ้ {lossCount}</span>
        </span>
      </div>

      {war?.locked && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700">
          🔒 กิลวอร์นี้จบแล้ว — แก้ไขทีมไม่ได้ (ดูได้อย่างเดียว)
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {busy && <p className="text-gray-400">กำลังโหลด...</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: ATTACK_SLOTS }, (_, i) => i + 1).map((slot) => {
          const atk = bySlot(slot);
          const target = atk?.targetDefenseId
            ? defenses.find((d) => d.id === atk.targetDefenseId)
            : null;
          const targetIdx = target ? defenses.indexOf(target) + 1 : null;
          return (
            <div
              key={slot}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                atk?.done ? "border-green-200" : "border-gray-100"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-sm font-bold text-rose-500">
                    {slot}
                  </span>
                  <h3 className="font-semibold">ทีมโจมตี #{slot}</h3>
                  {atk?.result === "win" && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600">
                      ชนะ
                    </span>
                  )}
                  {atk?.result === "loss" && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-500">
                      แพ้
                    </span>
                  )}
                  {atk?.done && !atk?.result && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                      ตีแล้ว
                    </span>
                  )}
                </div>
                {!locked && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditSlot(slot)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50"
                    >
                      {atk?.formation ? "แก้ไข" : "จัดทีม"}
                    </button>
                    {atk && (
                      <button
                        onClick={() => clearSlot(atk.id)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                )}
              </div>

              {atk?.formation ? (
                <FormationPreview formation={atk.formation} />
              ) : (
                <p className="py-4 text-sm text-gray-400">ยังไม่ได้จัดทีม</p>
              )}

              {atk && (
                <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                  {targetIdx ? (
                    <span className="text-gray-600">
                      <b>ทีมโจมตี #{slot}</b> โจมตี{" "}
                      <b className="text-rose-600">ทีมป้องกัน #{targetIdx}</b>
                      {target?.label ? ` · ${target.label}` : ""}
                    </span>
                  ) : (
                    <span className="text-gray-400">ยังไม่เลือกเป้าหมาย</span>
                  )}
                  <span
                    className={`ml-1 font-semibold ${
                      atk.done ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    — {atk.done ? "ตีแล้ว" : "ยังไม่ตี"}
                  </span>
                  {atk.link && (
                    <a
                      href={atk.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 font-medium text-blue-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🔗 7k-combo
                    </a>
                  )}
                </div>
              )}

              {target && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-blue-600">
                    🛡️ ตีทีมป้องกัน #{targetIdx}
                    {target.label ? ` · ${target.label}` : ""}
                  </p>
                  <FormationPreview formation={target.formation} size={34} />
                </div>
              )}

              {atk && !locked && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setResult(atk, "win")}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      atk.result === "win"
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-green-200 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    ชนะ
                  </button>
                  <button
                    onClick={() => setResult(atk, "loss")}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      atk.result === "loss"
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-red-200 text-red-500 hover:bg-red-50"
                    }`}
                  >
                    แพ้
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editSlot != null && (
        <AttackTeamModal
          warId={id}
          slot={editSlot}
          existing={bySlot(editSlot)}
          blockedUnitIds={blockedUnitIds(editSlot)}
          defenses={defenses}
          onClose={() => setEditSlot(null)}
          onSaved={() => {
            setEditSlot(null);
            load();
          }}
        />
      )}
    </main>
  );
}
