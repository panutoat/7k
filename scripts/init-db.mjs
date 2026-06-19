// Initialize the database schema. Usage: npm run db:init
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

const sql = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(sql);
  console.log("✅ Schema applied successfully.");
} catch (err) {
  console.error("❌ Failed to apply schema:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
