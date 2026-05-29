import { getPool } from "./client.js";
import type { Requirement } from "../rag/types.js";

interface RequirementRow {
  id: string;
  category: "dimensional" | "layout";
  subject: string;
  parameter: string;
  operator: Requirement["operator"];
  value_low: number;
  value_high: number | null;
  unit: string;
  clause: string;
  source_page: number;
  source_text: string;
  chunk_id: string | null;
}

export async function loadRequirements(): Promise<Requirement[]> {
  const pool = getPool();
  const { rows } = await pool.query<RequirementRow>(
    `SELECT id, category, subject, parameter, operator, value_low, value_high,
            unit, clause, source_page, source_text, chunk_id
     FROM requirements
     ORDER BY clause`
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    subject: row.subject,
    parameter: row.parameter,
    operator: row.operator,
    value: row.value_high === null ? Number(row.value_low) : [Number(row.value_low), Number(row.value_high)],
    unit: row.unit,
    clause: row.clause,
    sourcePage: row.source_page,
    sourceText: row.source_text,
    chunkId: row.chunk_id ?? "",
  }));
}
