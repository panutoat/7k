"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { session, isAdmin, logout, reload } = useAuth();
  const router = useRouter();

  async function doLogout() {
    await logout();
    router.push("/login");
  }

  // Switch role: log out and go to login to sign in as the other role.
  async function switchRole() {
    await logout();
    router.push("/login");
  }

  async function renameSelf() {
    if (!session?.memberId) return;
    const name = window.prompt("เปลี่ยนชื่อโปรไฟล์ (ใช้ชื่อใหม่ login ครั้งต่อไป)", session.name);
    if (!name || !name.trim() || name.trim() === session.name) return;
    const res = await fetch(`/api/members/${session.memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "เปลี่ยนชื่อไม่สำเร็จ");
    await reload();
  }

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          7k-เสือ
        </Link>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
              แอดมิน
            </span>
            <Link
              href="/admin"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              จัดการ
            </Link>
          </>
        ) : (
          session?.name && (
            <button
              onClick={renameSelf}
              className="text-sm text-gray-500 hover:text-rose-500"
              title="คลิกเพื่อเปลี่ยนชื่อ"
            >
              สวัสดี <b className="text-gray-700">{session.name}</b> ✎
            </button>
          )
        )}
        <button
          onClick={switchRole}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
          title={isAdmin ? "ไป login เป็นสมาชิก" : "ไป login เป็นแอดมิน"}
        >
          สลับบทบาท
        </button>
        <button
          onClick={doLogout}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}
