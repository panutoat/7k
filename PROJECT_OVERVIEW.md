# 7k-combo — สรุปภาพรวมโปรเจกต์

> เอกสารนี้สรุปว่าโปรเจกต์มีอะไรบ้าง ทำอะไรไปแล้ว และโครงสร้างเป็นอย่างไร
> เพื่อให้กลับมาทำงานต่อได้เร็ว (onboarding / resume context)
>
> อัปเดตล่าสุด: 2026-06-21 · branch `main` · commit `a938172`

---

## 1. โปรเจกต์นี้คืออะไร

เว็บแอปวางแผน **สงครามกิลด์ (Guild War)** ของเกม **Seven Knights (7k)** — เป็นเครื่องมือ
ภายในกิลด์สำหรับ:

- เก็บ **คลังทีม (combo)** ที่ใช้ตีศัตรูแต่ละประเภท
- ให้สมาชิก **ล็อกอินมาวางแผนทีมโจมตี** สูงสุด 5 ทีมต่อสงคราม
- ให้แอดมิน **สร้างเป้าหมายสงคราม + ใส่ทีมป้องกันของศัตรู** และ **แนะนำทีมที่ใช้ตีแต่ละ defense**
- จัดการ **roster ตัวละคร/สัตว์เลี้ยง** พร้อมรูป portrait

UI เป็นภาษาไทยทั้งหมด

---

## 2. Tech stack

| ส่วน | ใช้อะไร |
| ---- | ------- |
| Framework | **Next.js 14** (App Router) + TypeScript |
| Styling | **Tailwind CSS** |
| Database | **PostgreSQL** ผ่าน `pg` — หรือ **PGlite** (embedded Postgres in-process) เมื่อไม่ตั้ง `DATABASE_URL` |
| Auth | Shared-password + signed HMAC cookie (ไม่มี external provider) |
| Hosting | **Vercel** (บัญชี `panutoat`) + Neon/Supabase — deploy ผ่าน GitHub Actions (ไม่ใช้ Vercel git integration) |
| CI/CD | **GitHub Actions** — build gate (type-check + next build) แล้วยิง Vercel Deploy Hook |

**สำคัญ:** ไม่ต้องตั้งค่าอะไรก็รันได้ — ถ้าไม่มี `DATABASE_URL` จะใช้ PGlite เก็บไฟล์ที่ `./.pglite/`
สร้าง schema + seed roster อัตโนมัติใน request แรก

---

## 3. โครงสร้างไฟล์

```
.github/workflows/deploy.yml  GitHub Action: build gate → Vercel deploy hook

db/schema.sql              สำเนา schema (ของจริงสร้างจาก src/lib/db.ts → SCHEMA)
scripts/init-db.mjs        สคริปต์ db:init (optional)

src/lib/
  types.ts                 โดเมนไทป์ทั้งหมด + helper formation (แหล่งความจริงของ data model)
  db.ts                    Data layer ทั้งหมด (SCHEMA + ทุก query) — ไฟล์ใหญ่สุด
  dbClient.ts              เลือก backend: pg (DATABASE_URL) หรือ PGlite
  auth.ts                  Session cookie (HMAC), requireAdmin/requireRole/requireSession
  auth-context.tsx         React context ฝั่ง client สำหรับ session
  units-context.tsx        โหลด roster ครั้งเดียว, hook useUnits()
  units-validate.ts        ตรวจ input ตัวละคร
  data.ts                  DEFAULT_UNITS — roster เริ่มต้นไว้ seed
  drive.ts                 normalize ลิงก์ Google Drive → thumbnail endpoint
  api.ts                   helper fetch ฝั่ง client

src/app/                   หน้าเว็บ (App Router)
  page.tsx                 หน้าแรก — คลังทีม combo (filter ตามประเภทศัตรู)
  login/page.tsx           ล็อกอิน (ชื่อ + รหัส / รหัสแอดมิน)
  war/[id]/page.tsx        หน้าสมาชิก — วางแผน 5 ทีมโจมตี
  admin/page.tsx           หน้าแอดมิน — roster สมาชิก + สร้างสงคราม
  admin/wars/[id]/page.tsx บอร์ดจัดการในสงคราม (mark attack done, จับคู่ defense)
  admin/characters/page.tsx จัดการตัวละคร/สัตว์เลี้ยง + อัปโหลดรูป
  api/...                  API routes (ดูตาราง §5)

src/components/            React components (modal, formation editor, portrait ฯลฯ)
```

---

## 4. Data model (ตาราง DB)

นิยามจริงอยู่ใน [src/lib/db.ts](src/lib/db.ts) ค่าคงที่ `SCHEMA` (มี `ALTER TABLE ... IF NOT EXISTS`
สำหรับ migration อยู่ในตัว — schema สร้าง/อัปเกรดอัตโนมัติตอน `ensureSchema()`)

| ตาราง | หน้าที่ |
| ----- | ------- |
| `teams` | คลังทีม combo (formation เป็น JSONB, แยกตาม `enemy_type`: tank/magic/physical/other) |
| `units` | Roster ตัวละคร/สัตว์เลี้ยง — รูปเก็บได้ทั้ง `image` (bytea) หรือ `image_url` (ลิงก์) |
| `members` | สมาชิกกิลด์ (ชื่อ unique, `last_login_at`) |
| `member_logins` | นับจำนวนล็อกอินต่อวัน (วัน = เขต Asia/Bangkok) |
| `wars` | สงคราม — มี `active`, คะแนน `our_score`/`enemy_score`, `result` (win/lose) |
| `defense_teams` | ทีมป้องกันของศัตรูในแต่ละสงคราม (formation JSONB + link) |
| `attack_teams` | ทีมโจมตีของสมาชิก — slot 1..5, จับคู่ `target_defense_id`, `result`, `done` |
| `recommended_teams` | ทีมที่แอดมินแนะนำเพื่อตี defense หนึ่ง ๆ |
| `defense_library` | คลังกลาง (central library) ของ defense template — มี column `recommended JSONB` เก็บทีมแนะนำติดไปด้วย |

**Formation** (โครงสร้างทีม, ดู [types.ts](src/lib/types.ts)):
- `back[]` (หลัง) + `front[]` (หน้า) รวม 5 ช่องฮีโร่เสมอ + `pet` 1 ช่อง
- preset: basic (3/2), balanced (2/3), attack (4/1), defense (1/4)
- แต่ละ slot มี skill-order (`top`/`bottom`, รวมจองได้สูงสุด 3) และ `rings` (แหวนเลเจนด์ 3 ชนิด: คืนชีพ/อมตะ/โล่)
- กติกา: 1 ทีมมีฮีโร่ได้สูงสุด 3 ตัว (`MAX_HEROES`)

---

## 5. API routes

| Method | Route | หน้าที่ |
| ------ | ----- | ------- |
| GET/POST | `/api/teams` · DELETE `/api/teams/:id` | คลังทีม combo |
| GET/POST/PUT/DELETE | `/api/units` · `/api/units/:id` | roster |
| GET/POST | `/api/units/:id/image` · POST `/api/units/:id/image-url` | รูป portrait (อัปโหลด/ลิงก์) |
| POST | `/api/auth/login` · `/api/auth/logout` · GET `/api/auth/me` | auth |
| GET/POST | `/api/members` · PUT/DELETE `/api/members/:id` | สมาชิก |
| GET/POST | `/api/wars` · GET/PUT/DELETE `/api/wars/:id` | สงคราม |
| GET/POST | `/api/wars/:id/defenses` | ทีมป้องกันศัตรูในสงคราม |
| GET/POST | `/api/wars/:id/attacks` | ทีมโจมตีของสมาชิก (409 ถ้าใช้ฮีโร่ซ้ำในทีมตัวเอง) |
| GET | `/api/wars/:id/my-history` | ประวัติทีมโจมตีของฉันจากสงครามก่อน ๆ |
| PATCH/DELETE | `/api/attacks/:id` | แก้/ลบทีมโจมตี (admin mark done ฯลฯ) |
| GET/PUT/DELETE | `/api/defenses/:id` · GET/POST `/api/defenses/:id/recommended` | defense + ทีมแนะนำ |
| DELETE | `/api/recommended/:id` | ลบทีมแนะนำ |
| GET/POST | `/api/library` · PUT/DELETE `/api/library/:id` | คลัง defense กลาง |

**Auth model** ([auth.ts](src/lib/auth.ts)):
- สมาชิกล็อกอินด้วย **ชื่อ + รหัสกิลด์ร่วม** (`MEMBER_PASSWORD`)
- แอดมินใช้ **รหัสแอดมินแยก** (`ADMIN_PASSWORD`) — แอดมินทำงานบน member endpoint ได้ด้วย
- Session = signed HMAC cookie (`7kwar_session`, อายุ 30 วัน), secret = `AUTH_SECRET`

---

## 6. งานที่ทำไปแล้ว (ไทม์ไลน์จาก git)

โปรเจกต์เริ่มจากตัว **team builder** (คลัง combo) แล้วต่อยอดเป็นระบบ **guild war** ครบวงจร
ลำดับฟีเจอร์หลักจาก commit history:

- **Phase A** — formation UX: สีชัดขึ้น, click-to-match, pet ไม่มี T/B, ลิงก์ 7k-combo
- **Phase B** — ผลแพ้/ชนะ + การให้คะแนน
- **Phase C** — แก้โปรไฟล์/ชื่อ, แก้ defense
- **Phase D** — เครื่องมือ remaining-hero ของแอดมิน, drag & drop สลับตำแหน่งฮีโร่, **คลัง defense กลาง**
- แหวนเลเจนด์ (3 ชนิด stack ได้) ต่อฮีโร่
- War scores/result + แก้ชื่อกิลด์, participation จากการล็อกอิน, สลับ role
- **Central library**: เลือกหลาย template พร้อมกัน, select/deselect all, แก้ template (PUT)
- Drag heroes/pets จาก picker ลงช่อง formation
- Admin attack modal: ใส่ฮีโร่ที่ใช้เพื่อให้นับ remaining-hero แม่น + search box กรอง defense
- นับจำนวนล็อกอินต่อวัน (Asia/Bangkok), บอร์ดโชว์ยอดล็อกอินวันนี้
- **`cb8f424`**: ทีมโจมตีแนะนำต่อ defense (admin) + โชว์ก่อนเมื่อเลือกเป้าหมาย
- **ล่าสุด (`a938172`) FR1 — Fix suggestion teams**:
  - `defense_library` เพิ่ม column `recommended JSONB` เก็บทีมแนะนำเป็น snapshot ติดกับ entry
  - "เก็บคลัง" จาก admin war board คัดลอก `recommended_teams` ของ defense ไปด้วยพร้อมกัน
  - `LibraryEditModal` มี section เพิ่ม/แก้/ลบทีมแนะนำได้โดยตรงจากหน้าคลัง
  - `LibraryPickerModal` แสดง badge `⭐ N` บนการ์ด + ตอน import defense เข้าสงครามใหม่จะสร้าง `recommended_teams` rows ให้อัตโนมัติ
  - เพิ่ม type `RecommendedTemplate` + `sanitizeRecommended()` ใน `types.ts`
- **`a938172` GitHub Actions**: workflow `deploy.yml` — push `main` → build gate (type-check + next build) → ยิง `VERCEL_DEPLOY_HOOK` (repo secret); ใช้แทน Vercel git integration เพราะ Vercel ผูกบัญชี `panutoat` บัญชีเดียว

---

## 7. การรันโปรเจกต์

```bash
npm install
npm run dev          # → http://localhost:3000  (ใช้ PGlite อัตโนมัติ ไม่ต้องตั้งค่า)
```

ใช้ Postgres จริง:
```bash
cp .env.example .env   # ตั้ง DATABASE_URL, PGSSL, ADMIN_PASSWORD, MEMBER_PASSWORD, AUTH_SECRET
npm run db:init        # optional — schema สร้างเองตอน request แรกอยู่แล้ว
```

Scripts: `dev` · `build` · `start` · `lint` · `db:init`

**Default credentials (dev)**: admin `admin1234`, member `guild1234` — ⚠️ ต้องเปลี่ยนใน production
และตั้ง `AUTH_SECRET` เป็น random ยาว ๆ

---

## 8. จุดที่ควรรู้ / ข้อควรระวัง

- **`src/lib/db.ts` คือหัวใจ** — ทั้ง schema, migration, และทุก query รวมอยู่ที่นี่ (~900 บรรทัด)
  schema จริงอยู่ใน const `SCHEMA` ไม่ใช่ `db/schema.sql` (ตัวนั้นเก่ากว่า ไม่มีตารางสงคราม)
- **ทีมแนะนำใน library เป็น snapshot** — แก้ entry ในคลังภายหลังไม่กระทบสงครามที่ import ไปแล้ว (ตั้งใจให้เป็นแบบนี้ เหมือน formation/label ที่ copy อยู่แล้ว)
- **deploy ผ่าน GitHub Actions เท่านั้น** — อย่า enable Vercel git integration เพิ่มเติม จะ deploy ซ้ำซ้อน; secret ชื่อ `VERCEL_DEPLOY_HOOK` ตั้งใน repo settings แล้ว
- **รูป portrait** แนะนำใช้ลิงก์ (Google Drive normalize อัตโนมัติใน [drive.ts](src/lib/drive.ts))
  เพื่อให้ DB เล็กพออยู่ใน free tier; ถ้าไม่มีรูปจะ fallback เป็น gradient ([Portrait.tsx](src/components/Portrait.tsx))
- **PGlite เป็น local-only** — host แบบ serverless จะลบ `./.pglite/` ทุกครั้งที่ deploy ต้องใช้ Postgres จริง
- **กติกาฮีโร่ซ้ำ** บังคับฝั่ง server: ฮีโร่ใช้ซ้ำข้ามทีมโจมตีของตัวเองไม่ได้ (POST attacks ตอบ 409 พร้อม id ที่ชน)
- **เวลา/วัน** อิงเขต **Asia/Bangkok** (การนับล็อกอินต่อวัน)
