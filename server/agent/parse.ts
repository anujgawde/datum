import { z } from "zod";

const finishSchema = z.object({
  finish: z.object({
    status: z.enum(["pass", "fail", "unmatched"]),
    objectId: z.string().nullish(),
    objectName: z.string().nullish(),
    measured: z.number().nullish(),
    unit: z.string().optional(),
    reasoning: z.string().optional(),
  }),
});

const toolSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.unknown()).default({}),
  reasoning: z.string().optional(),
});

const actionSchema = z.union([finishSchema, toolSchema]);

export type ParsedAction =
  | { kind: "finish"; finish: z.infer<typeof finishSchema>["finish"] }
  | { kind: "tool"; tool: string; args: Record<string, unknown>; reasoning?: string };

export class ActionParseError extends Error {}

export function parseAction(raw: string): ParsedAction {
  const json = extractJsonObject(raw);
  if (json === null) throw new ActionParseError("no JSON object found in reply");

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new ActionParseError("reply was not valid JSON");
  }

  const result = actionSchema.safeParse(value);
  if (!result.success) {
    throw new ActionParseError(
      'reply must be {"tool", "args"} or {"finish": {...}}'
    );
  }

  if ("finish" in result.data) return { kind: "finish", finish: result.data.finish };
  return {
    kind: "tool",
    tool: result.data.tool,
    args: result.data.args,
    reasoning: result.data.reasoning,
  };
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}
