import { createHash } from "node:crypto";
import type { Page } from "./ingest.js";
import type { Chunk } from "./types.js";

const TARGET_CHARS = 800;
const OVERLAP_CHARS = 150;
const CLAUSE_PATTERN = /^\s*(\d+(?:\.\d+)+)\b/;

export function detectClause(text: string): string | null {
  const match = text.match(CLAUSE_PATTERN);
  return match ? match[1]! : null;
}

export function chunkPages(pages: Page[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const page of pages) {
    const paragraphs = page.text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    let buffer = "";
    let bufferClause: string | null = null;

    const flush = () => {
      const text = buffer.trim();
      if (text.length === 0) return;
      chunks.push({
        id: chunkId(page.sourceFile, page.page, chunks.length, text),
        sourceFile: page.sourceFile,
        page: page.page,
        clause: bufferClause,
        text,
      });
    };

    for (const para of paragraphs) {
      if (bufferClause === null) bufferClause = detectClause(para);

      if (buffer.length + para.length > TARGET_CHARS && buffer.length > 0) {
        flush();
        buffer = buffer.slice(-OVERLAP_CHARS);
        bufferClause = detectClause(para);
      }

      buffer += (buffer.length > 0 ? " " : "") + para;
    }

    flush();
  }

  return chunks;
}

function chunkId(sourceFile: string, page: number, index: number, text: string): string {
  const hash = createHash("sha1")
    .update(`${sourceFile}:${page}:${index}:${text}`)
    .digest("hex")
    .slice(0, 12);
  return `${page}-${index}-${hash}`;
}
