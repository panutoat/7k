"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Member, War } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { WarEditModal } from "@/components/WarEditModal";

export default function AdminHome() {
  const { session, loading, isAdmin } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [wars, setWars] = useState<War[]>([]);
  const [memberName, setMemberName] = useState("");
  const [warName, setWarName] = useState("");
  const [editWar, setEditWar] = useState<War | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (!isAdmin) router.replace("/");
  }, [loading, session, isAdmin, router]);

  const load = useCallback(async () => {
    const [m, w] = await Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/wars").then((r) => r.json()),
    ]);
    setMembers((m.members as Member[]) ?? []);
    setWars((w.wars as War[]) ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (loading || !isAdmin) {
    return <main className="p-8 text-gray-400">กำลังโหลด...</main>;
  }

  async function addMember() {
    const name = memberName.trim();
    if (!name) return;
    setError(null);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "เพิ่มไม่สำเร็จ");
    setMemberName("");
    load();
  }

  async function removeMember(id: string) {
    if (!confirm("ลบสมาชิกคนนี้?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    load();
  }

  async function renameMember(m: Member) {
    const name = window.prompt("แก้ชื่อสมาชิก", m.name);
    if (!name || !name.trim() || name.trim() === m.name) return;
    const res = await fetch(`/api/members/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "แก้ชื่อไม่สำเร็จ");
    load();
  }

  async function addWar() {
    const name = warName.trim();
    if (!name) return;
    setError(null);
    const res = await fetch("/api/wars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "สร้างไม่สำเร็จ");
    setWarName("");
    load();
  }

  async function toggleWar(w: War) {
    await fetch(`/api/wars/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !w.active }),
    });
    load();
  }

  async function removeWar(id: string) {
    if (!confirm("ลบกิลนี้ (รวมทีมป้องกัน/ผลการตีทั้งหมด)?")) return;
    await fetch(`/api/wars/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader subtitle="หน้าจัดการ" />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/admin/characters"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          จัดการตัวละคร
        </Link>
        <Link
          href="/library"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          คลังกิล / ทีมป้องกัน
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Wars */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">กิลเป้าหมาย</h2>
          <div className="mb-3 flex gap-2">
            <input
              value={warName}
              onChange={(e) => setWarName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWar()}
              placeholder="ชื่อกิลที่จะตี"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            />
            <button
              onClick={addWar}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
            >
              สร้าง
            </button>
          </div>
          <ul className="space-y-2">
            {wars.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-400">ยังไม่มีกิล</li>
            )}
            {wars.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2"
              >
                <Link
                  href={`/admin/wars/${w.id}`}
                  className="flex-1 truncate font-medium hover:text-rose-600"
                >
                  {w.name}
                  {w.result && (
                    <span
                      className={`ml-2 text-xs font-bold ${
                        w.result === "win" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {w.result === "win" ? "WIN" : "LOSE"}
                    </span>
                  )}
                  {w.ourScore != null && w.enemyScore != null && (
                    <span className="ml-1 text-xs text-gray-400">
                      {w.ourScore} - {w.enemyScore}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => toggleWar(w)}
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    w.active
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {w.active ? "เปิด" : "ปิด"}
                </button>
                <button
                  onClick={() => setEditWar(w)}
                  className="text-xs text-gray-400 hover:text-rose-500"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => removeWar(w.id)}
                  className="text-xs text-gray-300 hover:text-red-500"
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Members */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">สมาชิก ({members.length})</h2>
          <div className="mb-3 flex gap-2">
            <input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              placeholder="ชื่อสมาชิก"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            />
            <button
              onClick={addMember}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              เพิ่ม
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {members.length === 0 && (
              <li className="col-span-2 py-4 text-center text-sm text-gray-400">
                ยังไม่มีสมาชิก
              </li>
            )}
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm"
              >
                <span className="truncate">{m.name}</span>
                <span className="flex items-center gap-2">
                  <button
                    onClick={() => renameMember(m)}
                    className="text-xs text-gray-400 hover:text-rose-500"
                  >
                    แก้ชื่อ
                  </button>
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-xs text-gray-300 hover:text-red-500"
                  >
                    ลบ
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {editWar && (
        <WarEditModal
          war={editWar}
          onClose={() => setEditWar(null)}
          onSaved={() => {
            setEditWar(null);
            load();
          }}
        />
      )}
    </main>
  );
}
