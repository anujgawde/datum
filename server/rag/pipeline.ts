import { getProvider } from "../llm/index.js";
import { chunkPages } from "./chunk.js";
import { embedChunks } from "./embed.js";
import { extractRequirements } from "./extract.js";
import { ingestPdf } from "./ingest.js";
import { storeChunks, storeRequirements } from "./store.js";
import type { Requirement } from "./types.js";

export interface PipelineResult {
  sourceFile: string;
  pageCount: number;
  chunkCount: number;
  requirements: Requirement[];
}

export async function runPipeline(pdfPath: string): Promise<PipelineResult> {
  const provider = getProvider();

  const pages = await ingestPdf(pdfPath);
  const chunks = chunkPages(pages);

  const embedded = await embedChunks(provider, chunks);
  await storeChunks(embedded);

  const requirements = await extractRequirements(provider, chunks);
  await storeRequirements(requirements);

  return {
    sourceFile: pages[0]?.sourceFile ?? pdfPath,
    pageCount: pages.length,
    chunkCount: chunks.length,
    requirements,
  };
}
