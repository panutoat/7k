import { NextResponse } from "next/server";
import { createUnit, listUnits } from "@/lib/db";
import { parseUnitInput } from "@/lib/units-validate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const units = await listUnits();
    return NextResponse.json({ units });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseUnitInput(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const unit = await createUnit(parsed.value);
    return NextResponse.json({ unit }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}
