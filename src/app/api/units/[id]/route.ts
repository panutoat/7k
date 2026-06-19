import { NextResponse } from "next/server";
import { deleteUnit, updateUnit } from "@/lib/db";
import { parseUnitInput } from "@/lib/units-validate";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseUnitInput(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const unit = await updateUnit(params.id, parsed.value);
    if (!unit) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ unit });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ok = await deleteUnit(params.id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}
