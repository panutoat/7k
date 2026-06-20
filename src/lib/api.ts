import { NextResponse } from "next/server";
import { AuthError } from "./auth";

/** Convert thrown errors (incl. AuthError) into a JSON response. */
export function fail(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : "unknown error";
  return NextResponse.json({ error: msg }, { status: 500 });
}
