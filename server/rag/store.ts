import type { LLMProvider } from "../llm/index.js";
import { getPool } from "../db/client.js";
import type { Chunk, EmbeddedChunk, Requirement } from "./types.js";

function toVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function storeChunks(chunks: EmbeddedChunk[]): Promise<void> {
  const pool = getPool();
  for (const chunk of chunks) {
    await pool.query(
      `INSERT INTO chunks (id, source_file, page, clause, text, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         source_file = EXCLUDED.source_file,
         page = EXCLUDED.page,
         clause = EXCLUDED.clause,
         text = EXCLUDED.text,
         embedding = EXCLUDED.embedding`,
      [chunk.id, chunk.sourceFile, chunk.page, chunk.clause, chunk.text, toVector(chunk.embedding)]
    );
  }
}

export async function storeRequirements(requirements: Requirement[]): Promise<void> {
  const pool = getPool();
  for (const req of requirements) {
    const [low, high] = Array.isArray(req.value) ? req.value : [req.value, null];
    await pool.query(
      `INSERT INTO requirements
         (id, category, subject, parameter, operator, value_low, value_high,
          unit, clause, source_page, source_text, chunk_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [
        req.id, req.category, req.subject, req.parameter, req.operator,
        low, high, req.unit, req.clause, req.sourcePage, req.sourceText, req.chunkId,
      ]
    );
  }
}

export async function search(
  provider: LLMProvider,
  query: string,
  k = 5
): Promise<Chunk[]> {
  const [vector] = await provider.embed([query]);
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, source_file, page, clause, text
     FROM chunks
     ORDER BY embedding <=> $1
     LIMIT $2`,
    [toVector(vector!), k]
  );

  return rows.map((row) => ({
    id: row.id,
    sourceFile: row.source_file,
    page: row.page,
    clause: row.clause,
    text: row.text,
  }));
}
