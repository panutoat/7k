import { NextResponse } from "next/server";
import { getSession, requireAdmin, sessionCookie } from "@/lib/auth";
import { deleteMember, renameMember, setMemberNickname } from "@/lib/db";
import { Member } from "@/lib/types";
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

    const body = (await req.json()) as { name?: string; nickname?: string };

    try {
      let member: Member | null = null;
      // Rename (login name) when a non-empty name is provided.
      if ("name" in body) {
        const name = (body.name || "").trim();
        if (!name) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
        member = await renameMember(params.id, name);
      }
      // Set/clear the display nickname.
      if ("nickname" in body) {
        member = await setMemberNickname(
          params.id,
          (body.nickname || "").trim() || null
        );
      }
      if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });

      const res = NextResponse.json({ member });
      // Keep the cookie's name/nickname in sync when editing yourself.
      if (isSelf) {
        res.cookies.set(
          sessionCookie({
            role: "member",
            memberId: member.id,
            name: member.name,
            nickname: member.nickname,
          })
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
