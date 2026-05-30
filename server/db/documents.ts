import { getPool } from "./client.js";

export async function upsertProject(id: string, name?: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO projects (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [id, name ?? id]
  );
}

export async function upsertDocument(
  id: string,
  projectId: string,
  sourceFile: string,
  filePath: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO documents (id, project_id, source_file, file_path)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       source_file = EXCLUDED.source_file,
       file_path = EXCLUDED.file_path`,
    [id, projectId, sourceFile, filePath]
  );
}

export async function documentExists(id: string): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM documents WHERE id = $1) AS exists`,
    [id]
  );
  return rows[0]?.exists ?? false;
}

export async function clearDocumentData(documentId: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM requirements WHERE document_id = $1`, [documentId]);
  await pool.query(`DELETE FROM chunks WHERE document_id = $1`, [documentId]);
}
