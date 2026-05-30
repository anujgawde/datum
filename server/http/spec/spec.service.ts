import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { clearDocumentData, documentExists, upsertDocument, upsertProject } from "../../db/documents.js";
import { runPipeline } from "../../rag/pipeline.js";

const bodySchema = z.object({
  projectId: z.string().min(1),
  documentId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});

export interface SpecUploadResponse {
  projectId: string;
  documentId: string;
  name: string;
  requirementCount: number;
}

const UPLOADS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads");

function generateDocumentId(): string {
  return `doc-${randomBytes(3).toString("hex")}`;
}

@Injectable()
export class SpecService {
  async upload(
    file: { originalname: string; mimetype: string; buffer: Buffer } | undefined,
    body: unknown
  ): Promise<SpecUploadResponse> {
    if (!file) throw new Error('multipart field "file" is required');
    if (file.mimetype !== "application/pdf") {
      throw new Error(`expected application/pdf, got ${file.mimetype}`);
    }

    const parsed = bodySchema.parse(body);
    const projectId = parsed.projectId;
    const documentId = parsed.documentId ?? generateDocumentId();
    const name = parsed.name ?? file.originalname;

    await upsertProject(projectId);

    if (parsed.documentId && (await documentExists(documentId))) {
      await clearDocumentData(documentId);
    }

    const targetDir = join(UPLOADS_ROOT, projectId, documentId);
    const targetPath = join(targetDir, file.originalname);
    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, file.buffer);

    await upsertDocument(documentId, projectId, name, targetPath);

    const result = await runPipeline(targetPath, documentId);

    return {
      projectId,
      documentId,
      name,
      requirementCount: result.requirements.length,
    };
  }
}
