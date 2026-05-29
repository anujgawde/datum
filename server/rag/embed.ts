import type { LLMProvider } from "../llm/index.js";
import type { Chunk, EmbeddedChunk } from "./types.js";

const BATCH_SIZE = 16;

export async function embedChunks(
  provider: LLMProvider,
  chunks: Chunk[]
): Promise<EmbeddedChunk[]> {
  const embedded: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const vectors = await provider.embed(batch.map((c) => c.text));
    batch.forEach((chunk, j) => {
      embedded.push({ ...chunk, embedding: vectors[j]! });
    });
  }

  return embedded;
}
