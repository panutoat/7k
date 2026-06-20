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

  const usedCount = myAttacks.filter((a) => a.formation).length;
  const doneCount = myAttacks.filter((a) => a.done).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader subtitle={war ? `ตีกิล: ${war.name}` : undefined} />

      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← กลับ
        </Link>
        <span className="text-sm text-gray-500">
          จัดแล้ว {usedCount}/{ATTACK_SLOTS} ทีม · ตีแล้ว {doneCount}
        </span>
      </div>

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
                  {atk?.done && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600">
                      ตีแล้ว
                    </span>
                  )}
                </div>
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
              </div>

              {atk?.formation ? (
                <FormationPreview formation={atk.formation} />
              ) : (
                <p className="py-4 text-sm text-gray-400">ยังไม่ได้จัดทีม</p>
              )}

              {targetIdx && (
                <p className="mt-2 text-xs text-gray-400">
                  เป้าหมาย: ทีมป้องกัน #{targetIdx}
                  {target?.label ? ` · ${target.label}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Enemy defenses — read-only reference */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">
          ทีมป้องกันของศัตรู ({defenses.length})
        </h2>
        {defenses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            แอดมินยังไม่ได้ใส่ทีมป้องกัน
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {defenses.map((d, i) => (
              <div
                key={d.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <p className="mb-2 text-sm font-semibold text-gray-600">
                  #{i + 1}
                  {d.label ? ` · ${d.label}` : ""}
                </p>
                <FormationPreview formation={d.formation} size={38} />
              </div>
            ))}
          </div>
        )}
      </section>

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
