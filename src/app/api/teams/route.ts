import { NextResponse } from "next/server";
import { createTeam, listTeams } from "@/lib/db";
import { EnemyType, Formation } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: EnemyType[] = ["tank", "magic", "physical", "other"];

export async function GET() {
  try {
    const teams = await listTeams();
    return NextResponse.json({ teams });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      enemyType?: EnemyType;
      formation?: Formation;
    };

    const name = (body.name || "").trim() || "ทีมใหม่";
    const enemyType = body.enemyType;
    const formation = body.formation;

    if (!enemyType || !VALID_TYPES.includes(enemyType)) {
      return NextResponse.json({ error: "invalid enemyType" }, { status: 400 });
    }
    if (!formation || !formation.back || !formation.front || !formation.pet) {
      return NextResponse.json({ error: "invalid formation" }, { status: 400 });
    }

    const team = await createTeam({ name, enemyType, formation });
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}
