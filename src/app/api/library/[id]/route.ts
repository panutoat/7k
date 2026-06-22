import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteLibrary, updateLibrary } from "@/lib/db";
import { Formation, sanitizeRecommended } from "@/lib/types";
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
      recommended?: unknown;
    };
    if (!body.formation || !body.formation.back || !body.formation.front) {
      return NextResponse.json({ error: "invalid formation" }, { status: 400 });
    }
    const entry = await updateLibrary(params.id, {
      label: (body.label || "").trim(),
      formation: body.formation,
      link: (body.link || "").trim() || null,
      note: (body.note || "").trim() || null,
      recommended: sanitizeRecommended(body.recommended),
    });
    if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ entry });
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
    const ok = await deleteLibrary(params.id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
