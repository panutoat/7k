import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteMember } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

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
