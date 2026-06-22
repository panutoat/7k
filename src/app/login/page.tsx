"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const { loginAdmin, loginMember } = useAuth();
  const [tab, setTab] = useState<"member" | "admin">("member");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === "admin") {
        await loginAdmin(password);
        router.push("/admin");
      } else {
        await loginMember(name, password);
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-3 flex justify-end">
        <ThemeToggle />
      </div>
      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="border-b px-6 py-5">
          <h1 className="text-2xl font-extrabold tracking-tight">7k-เสือ</h1>
          <p className="text-sm text-gray-500">เข้าสู่ระบบเพื่อจัดทีมตีกิลวอ</p>
        </div>

        <div className="flex gap-2 px-6 pt-5">
          <Tab active={tab === "member"} onClick={() => setTab("member")}>
            สมาชิก
          </Tab>
          <Tab active={tab === "admin"} onClick={() => setTab("admin")}>
            แอดมิน
          </Tab>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          {tab === "member" && (
            <div>
              <label className="mb-1 block text-sm text-gray-500">ชื่อในกิล</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อที่แอดมินเพิ่มไว้"
                className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-rose-300"
                autoFocus
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-gray-500">
              {tab === "admin" ? "รหัสแอดมิน" : "รหัสกิล"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-rose-300"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50"
          >
            {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
