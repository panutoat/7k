import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listMemberAttackHistory } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

/** The current member's previously-used attack formations from other wars. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (!session.memberId) return NextResponse.json({ history: [] });
    const history = await listMemberAttackHistory(session.memberId, params.id);
    return NextResponse.json({ history });
  } catch (err) {
    return fail(err);
  }
}
