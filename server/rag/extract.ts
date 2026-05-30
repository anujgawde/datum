import { createHash } from "node:crypto";
import type { ChatMessage, LLMProvider } from "../llm/index.js";
import { requirementListSchema, type Chunk, type Requirement } from "./types.js";

const SYSTEM_PROMPT = `You extract structural-spec requirements from a passage of text.
Return ONLY dimensional or layout requirements that can be checked against a 3D model's
geometry (heights, widths, thicknesses, spacings, clearances). Ignore narrative text,
materials, fire ratings, and anything not dimensional or layout related.

Respond with JSON matching exactly:
{
  "requirements": [
    {
      "category": "dimensional" | "layout",
      "subject": string,        // the element the rule applies to, e.g. "exterior wall"
      "parameter": string,      // e.g. "height", "thickness", "spacing"
      "operator": ">=" | "<=" | "==" | "between",
      "value": number | [number, number],   // single number, or [low, high] when operator is "between"
      "unit": string,           // e.g. "m", "mm"
      "clause": string,         // the clause reference this came from, e.g. "3.2.1"
      "sourceText": string      // the verbatim sentence the requirement came from
    }
  ]
}

If the passage contains no such requirements, return {"requirements": []}.`;

export async function extractRequirements(
  provider: LLMProvider,
  chunks: Chunk[]
): Promise<Requirement[]> {
  const requirements: Requirement[] = [];

  for (const chunk of chunks) {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: chunkPrompt(chunk) },
    ];

    const raw = await provider.chat(messages, { format: "json", temperature: 0 });
    const parsed = safeParse(raw);
    if (!parsed) continue;

    for (const req of parsed.requirements) {
      requirements.push({
        ...req,
        clause: req.clause || chunk.clause || "unknown",
        sourcePage: chunk.page,
        chunkId: chunk.id,
        documentId: chunk.documentId,
        id: requirementId(chunk.id, req.subject, req.parameter),
      });
    }
  }

  return requirements;
}

function chunkPrompt(chunk: Chunk): string {
  const clauseHint = chunk.clause ? `Clause ${chunk.clause}. ` : "";
  return `${clauseHint}Passage (page ${chunk.page}):\n\n${chunk.text}`;
}

function safeParse(raw: string): { requirements: ReturnType<typeof requirementListSchema.parse>["requirements"] } | null {
  const json = extractJsonObject(raw);
  if (!json) return null;

  const result = requirementListSchema.safeParse(json);
  if (!result.success) return null;
  return result.data;
}

function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function requirementId(chunkId: string, subject: string, parameter: string): string {
  const hash = createHash("sha1")
    .update(`${chunkId}:${subject}:${parameter}`)
    .digest("hex")
    .slice(0, 12);
  return `req-${hash}`;
}
