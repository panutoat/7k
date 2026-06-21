import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setLibraryRank } from "@/lib/db";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Admin: set/clear a library team's rank in OUR guild's defense lineup. */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin();
    const body = (await req.json()) as { rank?: number | null };
    const rank =
      body.rank === null || body.rank === undefined
        ? null
        : Number.isFinite(Number(body.rank))
        ? Math.round(Number(body.rank))
        : null;
    const entry = await setLibraryRank(params.id, rank);
    if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (err) {
    return fail(err);
  }
}
