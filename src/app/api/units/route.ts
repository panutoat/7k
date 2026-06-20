import { NextResponse } from "next/server";
import { createUnit, listUnits } from "@/lib/db";
import { parseUnitInput } from "@/lib/units-validate";
import { requireAdmin } from "@/lib/auth";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const units = await listUnits();
    return NextResponse.json({ units });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin();
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseUnitInput(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const unit = await createUnit(parsed.value);
    return NextResponse.json({ unit }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
