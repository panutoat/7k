"use client";

import { useRef, useState } from "react";
import { CATEGORIES, Category, Unit, UnitKind } from "@/lib/types";
import { toDirectImageUrl } from "@/lib/drive";
import { Portrait } from "./Portrait";

export interface UnitDraft {
  name: string;
  category: Category;
  kind: UnitKind;
  stars: number;
  hue: number;
}

/**
 * Create / edit a single unit. Handles the metadata save plus an optional
 * image upload, then hands the refreshed roster back via onSaved().
 */
export function UnitEditorModal({
  initial,
  onClose,
  onSaved,
}: {
  /** Existing unit to edit, or null to create a new one. */
  initial: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "o7k");
  const [kind, setKind] = useState<UnitKind>(initial?.kind ?? "character");
  const [stars, setStars] = useState(initial?.stars ?? 6);
  const [hue, setHue] = useState(initial?.hue ?? 0);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setFileUrl(f ? URL.createObjectURL(f) : null);
    if (f) setImageUrl(""); // a chosen file wins over a pasted link
  }

  const preview = fileUrl
    ? fileUrl
    : imageUrl.trim()
    ? toDirectImageUrl(imageUrl)
    : initial?.image ?? null;

  const previewUnit: Unit = {
    id: initial?.id ?? "preview",
    name: name || "??",
    category,
    kind,
    stars,
    hue,
    image: preview,
  };

  async function save() {
    if (!name.trim()) {
      setError("กรุณากรอกชื่อตัวละคร");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), category, kind, stars, hue };
      const res = await fetch(
        initial ? `/api/units/${initial.id}` : "/api/units",
        {
          method: initial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      const id: string = initial ? initial.id : data.unit.id;

      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        const imgRes = await fetch(`/api/units/${id}/image`, {
          method: "POST",
          body: fd,
        });
        const imgData = await imgRes.json();
        if (!imgRes.ok) throw new Error(imgData.error || "อัปโหลดรูปไม่สำเร็จ");
      } else if (imageUrl.trim()) {
        const imgRes = await fetch(`/api/units/${id}/image-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: imageUrl.trim() }),
        });
        const imgData = await imgRes.json();
        if (!imgRes.ok) throw new Error(imgData.error || "ดึงรูปจากลิงก์ไม่สำเร็จ");
      }

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-rose-500" />
            <h2 className="text-lg font-bold">
              {initial ? "แก้ไขตัวละคร" : "เพิ่มตัวละคร"}
            </h2>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 p-[3px]">
                <Portrait unit={previewUnit} size={84} />
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs font-medium text-rose-500 hover:underline"
              >
                {preview ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-gray-500">ชื่อ</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อตัวละคร"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-rose-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-500">ประเภท</label>
                <div className="flex gap-2">
                  <Toggle active={kind === "character"} onClick={() => setKind("character")}>
                    ตัวละคร
                  </Toggle>
                  <Toggle active={kind === "pet"} onClick={() => setKind("pet")}>
                    สัตว์เลี้ยง
                  </Toggle>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500">
              ลิงก์รูป (Google Drive หรือ URL รูปภาพ)
            </label>
            <input
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (e.target.value && file) pickFile(null); // a link clears a chosen file
              }}
              placeholder="วางลิงก์ Google Drive ที่แชร์เป็น “ทุกคนที่มีลิงก์”"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-300"
            />
            <p className="mt-1 text-xs text-gray-400">
              ระบบจะดึงรูปจากลิงก์มาเก็บไว้ให้ — หรือกด “อัปโหลดรูป” เพื่อเลือกไฟล์จากเครื่องก็ได้
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500">หมวดหมู่</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Toggle
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </Toggle>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-500">
                ดาว ({stars})
              </label>
              <input
                type="range"
                min={1}
                max={6}
                value={stars}
                onChange={(e) => setStars(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-500">
                สีพื้น (ใช้เมื่อไม่มีรูป)
              </label>
              <input
                type="range"
                min={0}
                max={360}
                value={hue}
                onChange={(e) => setHue(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: `hsl(${hue} 70% 55%)` }}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
