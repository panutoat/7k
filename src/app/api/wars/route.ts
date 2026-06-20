import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { createWar, listWars } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    // Members only see active wars; admins see everything.
    const wars = await listWars(session.role !== "admin");
    return NextResponse.json({ wars });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin();
    const body = (await req.json()) as { name?: string };
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "กรุณากรอกชื่อกิล" }, { status: 400 });
    const war = await createWar(name);
    return NextResponse.json({ war }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
