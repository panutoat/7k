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
  formationUnitIds,
} from "@/lib/types";
import { useUnits } from "@/lib/units-context";
import { AppHeader } from "@/components/AppHeader";
import { FormationPreview } from "@/components/FormationPreview";
import { DefenseModal } from "@/components/DefenseModal";
import { AdminAttackModal } from "@/components/AdminAttackModal";
import { LibraryPickerModal } from "@/components/LibraryPickerModal";

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
  const [showLibrary, setShowLibrary] = useState(false);
  const [editDefense, setEditDefense] = useState<DefenseTeam | null>(null);
  const [edit, setEdit] = useState<{ member: Member; slot: number } | null>(null);
  const [sort, setSort] = useState<"name" | "done-desc" | "done-asc">("done-desc");
  const [heroQuery, setHeroQuery] = useState("");
  const [pickedHeroes, setPickedHeroes] = useState<string[]>([]);
  const { units, getUnit } = useUnits();

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

  const statsOf = (memberId: string) => {
    const mine = attacks.filter((a) => a.memberId === memberId);
    return {
      done: mine.filter((a) => a.done).length,
      win: mine.filter((a) => a.result === "win").length,
      loss: mine.filter((a) => a.result === "loss").length,
    };
  };

  const sortedMembers = [...members].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const diff = statsOf(b.id).done - statsOf(a.id).done;
    return sort === "done-asc" ? -diff : diff;
  });

  // Heroes each member has already committed this war (for "remaining" tool).
  const usedByMember = new Map<string, Set<string>>();
  for (const a of attacks) {
    if (!a.formation) continue;
    const set = usedByMember.get(a.memberId) ?? new Set<string>();
    for (const uid of formationUnitIds(a.formation)) set.add(uid);
    usedByMember.set(a.memberId, set);
  }
  const membersWithHeroFree = (heroId: string) =>
    members.filter((m) => !usedByMember.get(m.id)?.has(heroId));

  const heroResults = heroQuery.trim()
    ? units
        .filter(
          (u) =>
            u.kind === "character" &&
            u.name.includes(heroQuery.trim()) &&
            !pickedHeroes.includes(u.id)
        )
        .slice(0, 8)
    : [];

  async function deleteDefense(defId: string) {
    if (!confirm("ลบทีมป้องกันนี้?")) return;
    await fetch(`/api/defenses/${defId}`, { method: "DELETE" });
    load();
  }

  async function saveToLibrary(d: DefenseTeam) {
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: d.label, formation: d.formation, link: d.link }),
    });
    if (res.ok) alert("บันทึกเข้าคลังแล้ว");
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowLibrary(true)}
              className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              เลือกจากคลัง
            </button>
            <button
              onClick={() => setShowDefense(true)}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              + เพิ่มทีมป้องกัน
            </button>
          </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveToLibrary(d)}
                      className="text-xs text-gray-400 hover:text-blue-500"
                      title="บันทึกเข้าคลังกลาง"
                    >
                      เก็บคลัง
                    </button>
                    <button
                      onClick={() => setEditDefense(d)}
                      className="text-xs text-gray-400 hover:text-rose-500"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => deleteDefense(d.id)}
                      className="text-xs text-gray-300 hover:text-red-500"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
                <FormationPreview formation={d.formation} size={38} />
                {d.link && (
                  <a
                    href={d.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-blue-500 hover:underline"
                  >
                    🔗 7k-combo
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Attack board */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">ตารางการตี (คลิกช่องเพื่อมาร์ค/จับคู่)</h2>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-rose-300"
          >
            <option value="done-desc">ตีมาก → น้อย</option>
            <option value="done-asc">ตีน้อย → มาก</option>
            <option value="name">เรียงตามชื่อ</option>
          </select>
        </div>
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
                  <th className="px-3 py-3 text-center font-medium">ตี</th>
                  <th className="px-3 py-3 text-center font-medium text-green-600">ชนะ</th>
                  <th className="px-3 py-3 text-center font-medium text-red-500">แพ้</th>
                  <th className="px-3 py-3 text-center font-medium">ร่วม%</th>
                  <th className="px-3 py-3 text-center font-medium">เข้าระบบ</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m) => {
                  const s = statsOf(m.id);
                  const part = Math.round((s.done / ATTACK_SLOTS) * 100);
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{m.name}</td>
                      {Array.from({ length: ATTACK_SLOTS }, (_, i) => i + 1).map(
                        (slot) => {
                          const atk = attackOf(m.id, slot);
                          const cls =
                            atk?.result === "win"
                              ? "bg-green-500 text-white border-green-500"
                              : atk?.result === "loss"
                              ? "bg-red-500 text-white border-red-500"
                              : atk?.done
                              ? "bg-gray-400 text-white border-gray-400"
                              : atk?.formation
                              ? "bg-rose-100 text-rose-600 border-rose-200"
                              : "border-dashed border-gray-200 text-gray-300";
                          const mark =
                            atk?.result === "win"
                              ? "W"
                              : atk?.result === "loss"
                              ? "L"
                              : atk?.done
                              ? "✓"
                              : atk?.formation
                              ? "●"
                              : "+";
                          return (
                            <td key={slot} className="px-1 py-2 text-center">
                              <button
                                onClick={() => setEdit({ member: m, slot })}
                                className={`grid h-8 w-8 place-items-center rounded-lg border text-xs font-bold transition hover:scale-105 ${cls}`}
                                title="คลิกเพื่อมาร์ค/จับคู่"
                              >
                                {mark}
                              </button>
                            </td>
                          );
                        }
                      )}
                      <td className="px-3 py-2 text-center font-semibold text-gray-500">
                        {s.done}/{ATTACK_SLOTS}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-green-600">
                        {s.win}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-red-500">
                        {s.loss}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{part}%</td>
                      <td className="px-3 py-2 text-center">
                        {m.lastLoginAt ? (
                          <span
                            className="text-green-600"
                            title={new Date(m.lastLoginAt).toLocaleString("th-TH")}
                          >
                            ✓
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Remaining-hero tool */}
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">ฮีโร่คงเหลือ (ใครยังไม่ใช้)</h2>
        <p className="mb-3 text-sm text-gray-400">
          เลือกฮีโร่เพื่อดูว่าสมาชิกคนไหน “ยังไม่ได้ใช้” ตัวนี้ในวอร์นี้
        </p>
        <div className="relative max-w-sm">
          <input
            value={heroQuery}
            onChange={(e) => setHeroQuery(e.target.value)}
            placeholder="ค้นหาฮีโร่เพื่อเพิ่ม..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
          />
          {heroResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {heroResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setPickedHeroes((p) => [...p, u.id]);
                    setHeroQuery("");
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-rose-50"
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pickedHeroes.map((hid) => {
            const free = membersWithHeroFree(hid);
            return (
              <div
                key={hid}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">
                    {getUnit(hid)?.name ?? hid}
                  </span>
                  <button
                    onClick={() =>
                      setPickedHeroes((p) => p.filter((x) => x !== hid))
                    }
                    className="text-xs text-gray-300 hover:text-red-500"
                  >
                    เอาออก
                  </button>
                </div>
                <p className="mb-1 text-sm text-gray-500">
                  เหลือ <b className="text-rose-600">{free.length}</b> คน
                </p>
                <p className="text-xs text-gray-500">
                  {free.length ? free.map((m) => m.name).join(", ") : "— ไม่มี —"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {showLibrary && (
        <LibraryPickerModal
          warId={id}
          onClose={() => setShowLibrary(false)}
          onAdded={() => {
            setShowLibrary(false);
            load();
          }}
        />
      )}

      {(showDefense || editDefense) && (
        <DefenseModal
          warId={id}
          initial={editDefense ?? undefined}
          onClose={() => {
            setShowDefense(false);
            setEditDefense(null);
          }}
          onSaved={() => {
            setShowDefense(false);
            setEditDefense(null);
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
