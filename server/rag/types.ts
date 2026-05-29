import { z } from "zod";

export interface Chunk {
  id: string;
  sourceFile: string;
  page: number;
  clause: string | null;
  text: string;
}

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

export const requirementSchema = z.object({
  category: z.enum(["dimensional", "layout"]),
  subject: z.string().min(1),
  parameter: z.string().min(1),
  operator: z.enum([">=", "<=", "==", "between"]),
  value: z.union([z.number(), z.tuple([z.number(), z.number()])]),
  unit: z.string().min(1),
  clause: z.string().min(1),
  sourceText: z.string().min(1),
});

export const requirementListSchema = z.object({
  requirements: z.array(requirementSchema),
});

export type ExtractedRequirement = z.infer<typeof requirementSchema>;

export interface Requirement extends ExtractedRequirement {
  id: string;
  sourcePage: number;
  chunkId: string;
}
