import { getPool } from "./client.js";
import type { Requirement } from "../rag/types.js";

interface RequirementRow {
  id: string;
  document_id: string;
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

export interface LoadRequirementsOptions {
  projectId?: string;
  documentIds?: string[];
  requirementIds?: string[];
}

export async function loadRequirements(
  options: LoadRequirementsOptions = {}
): Promise<Requirement[]> {
  const projectId = options.projectId ?? "default";
  const documentIds = options.documentIds && options.documentIds.length > 0 ? options.documentIds : null;
  const requirementIds = options.requirementIds && options.requirementIds.length > 0 ? options.requirementIds : null;

  const pool = getPool();
  const { rows } = await pool.query<RequirementRow>(
    `SELECT r.id, r.document_id, r.category, r.subject, r.parameter, r.operator,
            r.value_low, r.value_high, r.unit, r.clause, r.source_page,
            r.source_text, r.chunk_id
     FROM requirements r
     JOIN documents d ON d.id = r.document_id
     WHERE d.project_id = $1
       AND ($2::text[] IS NULL OR r.document_id = ANY($2))
       AND ($3::text[] IS NULL OR r.id = ANY($3))
     ORDER BY r.clause`,
    [projectId, documentIds, requirementIds]
  );

  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
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
