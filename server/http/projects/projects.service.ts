import { Injectable } from "@nestjs/common";
import { getPool } from "../../db/client.js";

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: string;
}

export interface DocumentInfo {
  id: string;
  name: string;
  sourceFile: string;
  uploadedAt: string;
}

@Injectable()
export class ProjectsService {
  async listProjects(): Promise<ProjectInfo[]> {
    const pool = getPool();
    const { rows } = await pool.query<{ id: string; name: string; created_at: Date }>(
      `SELECT id, name, created_at FROM projects ORDER BY created_at`
    );
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at.toISOString() }));
  }

  async listDocuments(projectId: string): Promise<DocumentInfo[]> {
    const pool = getPool();
    const { rows } = await pool.query<{
      id: string;
      source_file: string;
      uploaded_at: Date;
    }>(
      `SELECT id, source_file, uploaded_at FROM documents
       WHERE project_id = $1
       ORDER BY uploaded_at`,
      [projectId]
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.source_file,
      sourceFile: r.source_file,
      uploadedAt: r.uploaded_at.toISOString(),
    }));
  }
}
