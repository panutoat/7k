# 7k-combo

A Next.js clone of the [7k-combo](https://7k-combo.pages.dev/) team-builder — pick an
enemy team type, place characters/pets into a front/back formation with T/B skill-order
toggles, and save teams to PostgreSQL.

## Guild war

Members log in and plan attacks against an enemy guild:

- **Login** (`/login`): members enter their name + a shared guild password; admins use a
  separate admin password. Sessions are a signed cookie (`src/lib/auth.ts`). Passwords come
  from env vars (see below).
- **Admin** (`/admin`): pre-create the member roster, create war targets, and add the enemy's
  **defense teams**. Inside a war (`/admin/wars/:id`) there's a board to mark each member's
  attacks done / pair them with a defense — handy when someone attacked in-game but didn't
  fill the web.
- **Member** (`/war/:id`): build up to **5 attack teams**. A hero **cannot be reused across
  your own teams** — enforced server-side (`/api/wars/:id/attacks` returns 409 with the
  conflicting unit ids).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL (via `pg`) for saved teams and the character roster (portraits stored inline as `bytea`)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### No Postgres? Nothing to set up.

If `DATABASE_URL` is **not** set, the app uses an embedded Postgres
([PGlite](https://github.com/electric-sql/pglite)) that runs in-process and persists
to a local `./.pglite/` folder — no server, no config. The schema is created and the
roster is seeded automatically on the first request.

### Using a real Postgres server

```bash
cp .env.example .env
#   set DATABASE_URL to your Postgres instance
npm run db:init   # optional — schema is also created on the first API request
```

The same SQL runs on either backend; `src/lib/dbClient.ts` picks `pg` when
`DATABASE_URL` is set and PGlite otherwise.

### Hosted Postgres (Neon / Supabase / Railway)

Set `PGSSL=true` in `.env` alongside your `DATABASE_URL`.

## How it works

- **Home** (`src/app/page.tsx`) lists saved teams from `GET /api/teams` and filters by enemy type.
- **Add team** opens `TeamBuilderModal`: choose enemy type, place units into the formation,
  set up to 3 skill-order slots with the T/B toggles, then `POST /api/teams`.
- Teams are stored in the `teams` table with the formation as JSONB.

## Roster & characters

The roster lives in the `units` table and is managed from the **จัดการตัวละคร** page
(`/admin/characters`) — add/edit/delete characters & pets and upload a portrait image for
each. New characters added there are immediately available in the team builder.

- The first time the `units` table is empty it is **auto-seeded** from the defaults in
  `src/lib/data.ts` (`DEFAULT_UNITS`), so existing names show up out of the box.
Portraits can be set two ways:

- **External link (recommended for free hosting)** — paste a Google Drive share link
  (set to *Anyone with the link*) or any image URL. Only the link is stored
  (`units.image_url`); the bytes stay on the remote host, so the database stays tiny.
  Drive links are normalised to the public thumbnail endpoint automatically
  (`src/lib/drive.ts`).
- **Uploaded file** — stored inline in Postgres (`units.image` `bytea`) and served from
  `GET /api/units/:id/image`.

Units with neither fall back to the generated gradient in `src/components/Portrait.tsx`.
On the client, the roster is loaded once via `UnitsProvider`
(`src/lib/units-context.tsx`) and consumed with the `useUnits()` hook.

## API

| Method | Route                   | Description                          |
| ------ | ----------------------- | ------------------------------------ |
| GET    | `/api/teams`            | List saved teams                     |
| POST   | `/api/teams`            | Create a team                        |
| DELETE | `/api/teams/:id`        | Delete a team                        |
| GET    | `/api/units`            | List the roster                      |
| POST   | `/api/units`            | Create a character/pet               |
| PUT    | `/api/units/:id`        | Update a character/pet               |
| DELETE | `/api/units/:id`        | Delete a character/pet               |
| GET    | `/api/units/:id/image`     | Serve an uploaded portrait        |
| POST   | `/api/units/:id/image`     | Upload a portrait (multipart `image`) |
| POST   | `/api/units/:id/image-url` | Set the portrait from a link (`{ url }`) |

## Deploy (free hosting)

The embedded PGlite database is **local-only** — it writes to a `./.pglite/` folder, which
serverless/free hosts wipe on every deploy. For a real deployment, point the app at a free
hosted Postgres so data persists:

1. Create a free Postgres on **[Neon](https://neon.tech)** or **[Supabase](https://supabase.com)**
   and copy the connection string.
2. In your host (e.g. **Vercel**), set env vars:
   - `DATABASE_URL` = the connection string
   - `PGSSL` = `true`
   - `ADMIN_PASSWORD`, `MEMBER_PASSWORD` = login passwords (see `.env.example`)
   - `AUTH_SECRET` = a long random string (signs the session cookie)
3. Deploy. On the first request the schema is created and the roster auto-seeds.

Because portraits are stored as **links** (not bytes), the database stays well within free
tiers. The same `src/lib/dbClient.ts` adapter uses `pg` when `DATABASE_URL` is set and
PGlite for local dev — no code changes needed to deploy.
