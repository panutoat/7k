import { NextResponse } from "next/server";
import { getUnitImage, setUnitImage } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const img = await getUnitImage(params.id);
    if (!img) return NextResponse.json({ error: "not found" }, { status: 404 });
    return new NextResponse(new Uint8Array(img.data), {
      headers: {
        "Content-Type": img.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "รองรับเฉพาะ PNG, JPEG, WebP หรือ GIF" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 4MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ok = await setUnitImage(params.id, buffer, file.type);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      image: `/api/units/${params.id}/image?v=${Date.now()}`,
    });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}
