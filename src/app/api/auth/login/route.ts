import { NextResponse } from "next/server";
import {
  adminPassword,
  memberPassword,
  passwordMatches,
  sessionCookie,
} from "@/lib/auth";
import { findMemberByName } from "@/lib/db";
import { Session } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      role?: string;
      name?: string;
      password?: string;
    };
    const password = typeof body.password === "string" ? body.password : "";

    let session: Session;

    if (body.role === "admin") {
      if (!passwordMatches(password, adminPassword())) {
        return NextResponse.json({ error: "รหัสแอดมินไม่ถูกต้อง" }, { status: 401 });
      }
      session = { role: "admin" };
    } else {
      const name = (body.name || "").trim();
      if (!name) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
      if (!passwordMatches(password, memberPassword())) {
        return NextResponse.json({ error: "รหัสกิลไม่ถูกต้อง" }, { status: 401 });
      }
      const member = await findMemberByName(name);
      if (!member) {
        return NextResponse.json(
          { error: "ไม่พบชื่อนี้ในรายชื่อสมาชิก — ให้แอดมินเพิ่มชื่อก่อน" },
          { status: 401 }
        );
      }
      session = { role: "member", memberId: member.id, name: member.name };
    }

    const res = NextResponse.json({ session });
    res.cookies.set(sessionCookie(session));
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
