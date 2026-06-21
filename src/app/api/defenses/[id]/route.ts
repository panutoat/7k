import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteDefense, updateDefense } from "@/lib/db";
import { Formation } from "@/lib/types";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PUT(
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
    };
    if (!body.formation || !body.formation.back || !body.formation.front) {
      return NextResponse.json({ error: "invalid formation" }, { status: 400 });
    }
    const defense = await updateDefense(params.id, {
      label: (body.label || "").trim(),
      formation: body.formation,
      link: (body.link || "").trim() || null,
      note: (body.note || "").trim() || null,
    });
    if (!defense) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ defense });
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
    const ok = await deleteDefense(params.id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
