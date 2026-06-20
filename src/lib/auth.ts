import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Role, Session } from "./types";

// Lightweight shared-password auth — no external provider, free-host friendly.
// Members log in with their name + a shared guild password; admins use a
// separate admin password. The session is a signed (HMAC) cookie.

export const SESSION_COOKIE = "7kwar_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin1234";
}

export function memberPassword(): string {
  return process.env.MEMBER_PASSWORD || "guild1234";
}

/** Constant-time string compare. */
export function passwordMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (parsed?.role !== "admin" && parsed?.role !== "member") return null;
    return parsed as Session;
  } catch {
    return null;
  }
}

/** Read the current session from the request cookies (server only). */
export function getSession(): Session | null {
  return decodeSession(cookies().get(SESSION_COOKIE)?.value);
}

export function sessionCookie(session: Session) {
  return {
    name: SESSION_COOKIE,
    value: encodeSession(session),
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearedCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

/** Throw a typed error if the session lacks the required role. */
export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requireRole(role: Role): Session {
  const s = getSession();
  if (!s) throw new AuthError(401, "กรุณาเข้าสู่ระบบ");
  if (s.role !== role && s.role !== "admin") {
    // admins may act on member endpoints; otherwise role must match
    throw new AuthError(403, "ไม่มีสิทธิ์");
  }
  return s;
}

export function requireAdmin(): Session {
  const s = getSession();
  if (!s) throw new AuthError(401, "กรุณาเข้าสู่ระบบ");
  if (s.role !== "admin") throw new AuthError(403, "เฉพาะแอดมิน");
  return s;
}

export function requireSession(): Session {
  const s = getSession();
  if (!s) throw new AuthError(401, "กรุณาเข้าสู่ระบบ");
  return s;
}
