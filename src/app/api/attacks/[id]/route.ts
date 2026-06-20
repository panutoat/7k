import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteAttack, getAttack, patchAttack } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Admin (or the owning member) marks done / assigns a target defense. */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

    const existing = await getAttack(params.id);
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (session.role !== "admin" && session.memberId !== existing.memberId) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = (await req.json()) as {
      done?: boolean;
      targetDefenseId?: string | null;
    };
    const attack = await patchAttack(params.id, {
      done: typeof body.done === "boolean" ? body.done : undefined,
      targetDefenseId:
        "targetDefenseId" in body ? body.targetDefenseId ?? null : undefined,
    });
    return NextResponse.json({ attack });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const existing = await getAttack(params.id);
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (session.role !== "admin" && session.memberId !== existing.memberId) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }
    await deleteAttack(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
