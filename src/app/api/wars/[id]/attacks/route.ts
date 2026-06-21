import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWar, listAttacks, memberUsedUnitIds, upsertAttack } from "@/lib/db";
import { ATTACK_SLOTS, Formation, formationUnitIds } from "@/lib/types";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!getSession()) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const attacks = await listAttacks(params.id);
    return NextResponse.json({ attacks });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

    // Members cannot edit once the war is locked; admins still can.
    if (session.role !== "admin") {
      const war = await getWar(params.id);
      if (war?.locked) {
        return NextResponse.json({ error: "กิลวอร์จบแล้ว แก้ไขไม่ได้" }, { status: 403 });
      }
    }

    const body = (await req.json()) as {
      memberId?: string;
      slot?: number;
      formation?: Formation | null;
      targetDefenseId?: string | null;
      link?: string | null;
      result?: "win" | "loss" | null;
      done?: boolean;
    };

    // Members may only edit their own rows; admins act on behalf of a member.
    const memberId =
      session.role === "admin" ? body.memberId : session.memberId;
    if (!memberId) {
      return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 400 });
    }

    const slot = Number(body.slot);
    if (!Number.isInteger(slot) || slot < 1 || slot > ATTACK_SLOTS) {
      return NextResponse.json({ error: "ช่องทีมไม่ถูกต้อง" }, { status: 400 });
    }

    const formation = body.formation ?? null;

    // Enforce: a member cannot reuse a hero across their attack teams.
    if (formation) {
      const used = await memberUsedUnitIds(params.id, memberId, slot);
      const conflicts = [...new Set(formationUnitIds(formation))].filter((id) =>
        used.has(id)
      );
      if (conflicts.length > 0) {
        return NextResponse.json(
          { error: "มีตัวละครซ้ำกับทีมอื่นของคุณ", conflicts },
          { status: 409 }
        );
      }
    }

    const attack = await upsertAttack({
      warId: params.id,
      memberId,
      slot,
      formation,
      targetDefenseId: body.targetDefenseId ?? null,
      link: typeof body.link === "string" ? body.link.trim() || null : null,
      result: body.result === "win" || body.result === "loss" ? body.result : null,
      done: Boolean(body.done),
    });
    return NextResponse.json({ attack }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
