"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Session } from "./types";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  loginAdmin: (password: string) => Promise<void>;
  loginMember: (name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setSession((data.session as Session | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    reload();
  }, [reload]);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
    setSession(data.session as Session);
  }

  const loginAdmin = (password: string) => post({ role: "admin", password });
  const loginMember = (name: string, password: string) =>
    post({ role: "member", name, password });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isAdmin: session?.role === "admin",
        loginAdmin,
        loginMember,
        logout,
        reload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
