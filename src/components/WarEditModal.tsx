"use client";

import { useState } from "react";
import { War } from "@/lib/types";

/** Admin: rename a war target and record the final game score/result. */
export function WarEditModal({
  war,
  onClose,
  onSaved,
}: {
  war: War;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(war.name);
  const [ourScore, setOurScore] = useState(
    war.ourScore != null ? String(war.ourScore) : ""
  );
  const [enemyScore, setEnemyScore] = useState(
    war.enemyScore != null ? String(war.enemyScore) : ""
  );
  const [result, setResult] = useState<"win" | "lose" | null>(war.result);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("กรุณากรอกชื่อกิล");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/wars/${war.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ourScore: ourScore.trim() === "" ? null : Number(ourScore),
          enemyScore: enemyScore.trim() === "" ? null : Number(enemyScore),
          result,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">แก้ไขกิล / กรอกผลวอร์</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm text-gray-500">ชื่อกิล</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-rose-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500">
              แต้มหลังจบวอร์ (กรอกตามที่เกมคิด)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={ourScore}
                onChange={(e) => setOurScore(e.target.value)}
                placeholder="ฝั่งเรา"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
              <span className="text-gray-400">vs</span>
              <input
                type="number"
                value={enemyScore}
                onChange={(e) => setEnemyScore(e.target.value)}
                placeholder="ฝั่งศัตรู"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500">ผล</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResult(result === "win" ? null : "win")}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                  result === "win"
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-green-200 text-green-600 hover:bg-green-50"
                }`}
              >
                ชนะ
              </button>
              <button
                type="button"
                onClick={() => setResult(result === "lose" ? null : "lose")}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                  result === "lose"
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-red-200 text-red-500 hover:bg-red-50"
                }`}
              >
                แพ้
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
