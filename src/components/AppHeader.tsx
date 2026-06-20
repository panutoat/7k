"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { session, isAdmin, logout } = useAuth();
  const router = useRouter();

  async function doLogout() {
    await logout();
    router.push("/login");
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
            <span className="text-sm text-gray-500">
              สวัสดี <b className="text-gray-700">{session.name}</b>
            </span>
          )
        )}
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
