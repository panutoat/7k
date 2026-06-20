import { NextResponse } from "next/server";
import { getSession, requireAdmin, sessionCookie } from "@/lib/auth";
import { deleteMember, renameMember } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    // Admins can rename anyone; a member can rename only themselves.
    const isSelf = session.role === "member" && session.memberId === params.id;
    if (session.role !== "admin" && !isSelf) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = (await req.json()) as { name?: string };
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });

    try {
      const member = await renameMember(params.id, name);
      if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });
      const res = NextResponse.json({ member });
      // Keep the cookie's display name in sync when renaming yourself.
      if (isSelf) {
        res.cookies.set(
          sessionCookie({ role: "member", memberId: member.id, name: member.name })
        );
      }
      return res;
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

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin();
    const ok = await deleteMember(params.id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
