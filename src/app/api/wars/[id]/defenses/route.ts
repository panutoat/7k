import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { createDefense, createRecommended, listDefenses } from "@/lib/db";
import { Formation, sanitizeRecommended } from "@/lib/types";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!getSession()) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const defenses = await listDefenses(params.id);
    return NextResponse.json({ defenses });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin();
    const body = (await req.json()) as {
      label?: string;
      formation?: Formation;
      link?: string;
      note?: string;
      recommended?: unknown;
    };
    if (!body.formation || !body.formation.back || !body.formation.front) {
      return NextResponse.json({ error: "invalid formation" }, { status: 400 });
    }
    const defense = await createDefense({
      warId: params.id,
      label: (body.label || "").trim(),
      formation: body.formation,
      link: (body.link || "").trim() || null,
      note: (body.note || "").trim() || null,
    });
    // Carry any recommended attack teams (e.g. imported from the library).
    for (const r of sanitizeRecommended(body.recommended)) {
      await createRecommended({
        defenseId: defense.id,
        label: r.label,
        formation: r.formation,
        link: r.link,
        note: r.note,
      });
    }
    return NextResponse.json({ defense }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
