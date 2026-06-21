import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { deleteWar, getWar, memberLoginCountsForWar, updateWar } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!getSession()) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const war = await getWar(params.id);
    if (!war) return NextResponse.json({ error: "not found" }, { status: 404 });
    // Login counts scoped to this war's day (admin board uses this).
    const loginCounts = await memberLoginCountsForWar(params.id);
    return NextResponse.json({ war, loginCounts });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin();
    const body = (await req.json()) as {
      name?: string;
      active?: boolean;
      locked?: boolean;
      ourScore?: number | null;
      enemyScore?: number | null;
      result?: "win" | "lose" | null;
    };
    const num = (v: unknown) => {
      if (v === null) return null;
      const n = Math.round(Number(v));
      return Number.isFinite(n) ? n : undefined;
    };
    const war = await updateWar(params.id, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      locked: typeof body.locked === "boolean" ? body.locked : undefined,
      ourScore: "ourScore" in body ? num(body.ourScore) : undefined,
      enemyScore: "enemyScore" in body ? num(body.enemyScore) : undefined,
      result:
        "result" in body
          ? body.result === "win" || body.result === "lose"
            ? body.result
            : null
          : undefined,
    });
    if (!war) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ war });
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
    const ok = await deleteWar(params.id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
