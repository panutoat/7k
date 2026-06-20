import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { createLibrary, listLibrary } from "@/lib/db";
import { Formation } from "@/lib/types";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!getSession()) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const library = await listLibrary();
    return NextResponse.json({ library });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin();
    const body = (await req.json()) as {
      label?: string;
      formation?: Formation;
      link?: string;
    };
    if (!body.formation || !body.formation.back || !body.formation.front) {
      return NextResponse.json({ error: "invalid formation" }, { status: 400 });
    }
    const entry = await createLibrary({
      label: (body.label || "").trim(),
      formation: body.formation,
      link: (body.link || "").trim() || null,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
