"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  ATTACK_SLOTS,
  AttackTeam,
  DefenseTeam,
  Member,
  War,
} from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { FormationPreview } from "@/components/FormationPreview";
import { DefenseModal } from "@/components/DefenseModal";
import { AdminAttackModal } from "@/components/AdminAttackModal";

export default function AdminWarPage() {
  const { id } = useParams<{ id: string }>();
  const { loading, isAdmin } = useAuth();
  const router = useRouter();

  const [war, setWar] = useState<War | null>(null);
  const [defenses, setDefenses] = useState<DefenseTeam[]>([]);
  const [attacks, setAttacks] = useState<AttackTeam[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(true);
  const [showDefense, setShowDefense] = useState(false);
  const [edit, setEdit] = useState<{ member: Member; slot: number } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) router.replace("/login");
  }, [loading, isAdmin, router]);

  const load = useCallback(async () => {
    setBusy(true);
    const [w, d, a, m] = await Promise.all([
      fetch(`/api/wars/${id}`).then((r) => r.json()),
      fetch(`/api/wars/${id}/defenses`).then((r) => r.json()),
      fetch(`/api/wars/${id}/attacks`).then((r) => r.json()),
      fetch("/api/members").then((r) => r.json()),
    ]);
    setWar(w.war ?? null);
    setDefenses(d.defenses ?? []);
    setAttacks(a.attacks ?? []);
    setMembers(m.members ?? []);
    setBusy(false);
  }, [id]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (loading || !isAdmin) {
    return <main className="p-8 text-gray-400">กำลังโหลด...</main>;
  }

  const attackOf = (memberId: string, slot: number) =>
    attacks.find((a) => a.memberId === memberId && a.slot === slot) ?? null;

  async function deleteDefense(defId: string) {
    if (!confirm("ลบทีมป้องกันนี้?")) return;
    await fetch(`/api/defenses/${defId}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AppHeader subtitle={war ? `จัดการกิล: ${war.name}` : undefined} />
      <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">
        ← กลับหน้าจัดการ
      </Link>

      {busy && <p className="mt-4 text-gray-400">กำลังโหลด...</p>}

      {/* Defense teams */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">ทีมป้องกัน ({defenses.length})</h2>
          <button
            onClick={() => setShowDefense(true)}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          >
            + เพิ่มทีมป้องกัน
          </button>
        </div>
        {defenses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            ยังไม่มีทีมป้องกัน
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {defenses.map((d, i) => (
              <div
                key={d.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">
                    #{i + 1}
                    {d.label ? ` · ${d.label}` : ""}
                  </span>
                  <button
                    onClick={() => deleteDefense(d.id)}
                    className="text-xs text-gray-300 hover:text-red-500"
                  >
                    ลบ
                  </button>
                </div>
                <FormationPreview formation={d.formation} size={38} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Attack board */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">ตารางการตี (คลิกช่องเพื่อมาร์ค/จับคู่)</h2>
        {members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            ยังไม่มีสมาชิก — เพิ่มได้ที่หน้าจัดการ
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">สมาชิก</th>
                  {Array.from({ length: ATTACK_SLOTS }, (_, i) => (
                    <th key={i} className="px-2 py-3 text-center font-medium">
                      #{i + 1}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-medium">ตีแล้ว</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const doneCount = attacks.filter(
                    (a) => a.memberId === m.id && a.done
                  ).length;
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{m.name}</td>
                      {Array.from({ length: ATTACK_SLOTS }, (_, i) => i + 1).map(
                        (slot) => {
                          const atk = attackOf(m.id, slot);
                          const cls = atk?.done
                            ? "bg-green-500 text-white border-green-500"
                            : atk?.formation
                            ? "bg-rose-100 text-rose-600 border-rose-200"
                            : "border-dashed border-gray-200 text-gray-300";
                          return (
                            <td key={slot} className="px-1 py-2 text-center">
                              <button
                                onClick={() => setEdit({ member: m, slot })}
                                className={`grid h-8 w-8 place-items-center rounded-lg border text-xs font-bold transition hover:scale-105 ${cls}`}
                                title="คลิกเพื่อมาร์ค/จับคู่"
                              >
                                {atk?.done ? "✓" : atk?.formation ? "●" : "+"}
                              </button>
                            </td>
                          );
                        }
                      )}
                      <td className="px-4 py-2 text-center font-semibold text-gray-500">
                        {doneCount}/{ATTACK_SLOTS}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showDefense && (
        <DefenseModal
          warId={id}
          onClose={() => setShowDefense(false)}
          onSaved={() => {
            setShowDefense(false);
            load();
          }}
        />
      )}

      {edit && (
        <AdminAttackModal
          warId={id}
          memberId={edit.member.id}
          memberName={edit.member.name}
          slot={edit.slot}
          existing={attackOf(edit.member.id, edit.slot)}
          defenses={defenses}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            load();
          }}
        />
      )}
    </main>
  );
}
