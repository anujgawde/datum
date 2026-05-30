import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { runAgent } from "../../agent/agent.js";
import type { AgentTrace } from "../../agent/types.js";
import { runCheck } from "../../check/checker.js";
import { loadRequirements } from "../../db/requirements.js";
import { getProvider } from "../../llm/index.js";
import type { Requirement } from "../../rag/types.js";
import type { Report, Snapshot } from "../../tools/types.js";

const requestSchema = z.object({
  snapshot: z
    .object({ units: z.string(), objects: z.array(z.unknown()) })
    .passthrough(),
  mode: z.enum(["deterministic", "agentic"]).default("deterministic"),
  requirements: z.array(z.unknown()).optional(),
});

export interface CheckResponse {
  report: Report;
  trace?: AgentTrace[];
}

@Injectable()
export class CheckService {
  async check(body: unknown): Promise<CheckResponse> {
    const parsed = requestSchema.parse(body);
    const snapshot = parsed.snapshot as unknown as Snapshot;
    const requirements =
      (parsed.requirements as Requirement[] | undefined) ?? (await loadRequirements());

    if (parsed.mode === "agentic") {
      const result = await runAgent(getProvider(), snapshot, requirements);
      return { report: result.report, trace: result.trace };
    }

    return { report: runCheck(snapshot, requirements) };
  }
}
