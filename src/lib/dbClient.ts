import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";

/**
 * Minimal query interface shared by the two backends:
 *  - `pg` Pool when DATABASE_URL points at a real Postgres server, or
 *  - PGlite (embedded Postgres, persisted to a local folder) when it does not.
 *
 * Both speak the same Postgres dialect, so the rest of the data layer is
 * identical regardless of which one is active.
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface Db {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  /** Run one or more statements (no params). Used for schema setup. */
  exec(text: string): Promise<void>;
}

declare global {
  // eslint-disable-next-line no-var
  var _dbClient: Db | undefined;
}

function makePgPool(connectionString: string): Db {
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  return {
    async query(text, params) {
      const r = await pool.query(text, params as unknown[] | undefined);
      return { rows: r.rows as never[], rowCount: r.rowCount ?? 0 };
    },
    async exec(text) {
      await pool.query(text);
    },
  };
}

function makePglite(): Db {
  // Persist to a local folder so data survives restarts (gitignored).
  const dir = process.env.PGLITE_DIR || `${process.cwd()}/.pglite`;
  const pg = new PGlite(dir);
  return {
    async query(text, params) {
      const r = await pg.query(text, params as unknown[] | undefined);
      const rows = (r.rows ?? []) as never[];
      return { rows, rowCount: r.affectedRows ?? rows.length };
    },
    async exec(text) {
      await pg.exec(text);
    },
  };
}

/** Lazily create (and cache across dev hot-reloads) the active DB client. */
export function getDb(): Db {
  if (!global._dbClient) {
    const url = process.env.DATABASE_URL;
    global._dbClient = url ? makePgPool(url) : makePglite();
    if (!url) {
      // eslint-disable-next-line no-console
      console.log(
        "[db] DATABASE_URL not set — using embedded PGlite at ./.pglite"
      );
    }
  }
  return global._dbClient;
}
