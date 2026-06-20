import { NextResponse } from "next/server";
import { setUnitImageUrl } from "@/lib/db";
import { toDirectImageUrl } from "@/lib/drive";
import { requireAdmin } from "@/lib/auth";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Store an external image link (Google Drive share link or any image URL) on
 * the unit. The bytes stay on the remote host — nothing is downloaded to the
 * server — so the database stays tiny and free-tier friendly.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin();
    const body = (await req.json()) as { url?: unknown };
    const raw = typeof body.url === "string" ? body.url.trim() : "";
    if (!raw) return NextResponse.json({ error: "กรุณาวางลิงก์รูป" }, { status: 400 });
    if (!/^https?:\/\//i.test(raw)) {
      return NextResponse.json(
        { error: "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://" },
        { status: 400 }
      );
    }

    const url = toDirectImageUrl(raw);
    const ok = await setUnitImageUrl(params.id, url);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });

    return NextResponse.json({ ok: true, image: url });
  } catch (err) {
    return fail(err);
  }
}
