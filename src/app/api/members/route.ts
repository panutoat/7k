import { NextResponse } from "next/server";
import { requireAdmin, requireSession } from "@/lib/auth";
import { createMember, listMembers } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireSession(); // any logged-in user may read the roster
    const members = await listMembers();
    return NextResponse.json({ members });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin();
    const body = (await req.json()) as { name?: string };
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
    try {
      const member = await createMember(name);
      return NextResponse.json({ member }, { status: 201 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/unique|duplicate/i.test(msg)) {
        return NextResponse.json({ error: "มีชื่อนี้อยู่แล้ว" }, { status: 409 });
      }
      throw e;
    }
  } catch (err) {
    return fail(err);
  }
}
