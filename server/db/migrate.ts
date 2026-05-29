import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, getPool } from "./client.js";

async function migrate(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const sql = await readFile(join(here, "schema.sql"), "utf8");

  const pool = getPool();
  await pool.query(sql);
  console.log("Datum: schema applied (chunks, requirements, pgvector).");
}

migrate()
  .catch((err) => {
    console.error("Datum: migration failed.", err);
    process.exitCode = 1;
  })
  .finally(closePool);
