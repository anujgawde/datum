import type { ChatMessage, LLMProvider } from "../llm/index.js";
import type { Requirement } from "../rag/types.js";
import type { Finding, Report, Snapshot } from "../tools/types.js";
import { ActionParseError, parseAction } from "./parse.js";
import { requirementPrompt, systemPrompt } from "./prompt.js";
import { getTool, type ToolContext } from "./tools.js";
import type { AgentResult, AgentStep, AgentTrace } from "./types.js";

const DEFAULT_MAX_STEPS = 8;

export interface AgentOptions {
  maxSteps?: number;
}

export async function runAgent(
  provider: LLMProvider,
  snapshot: Snapshot,
  requirements: Requirement[],
  options: AgentOptions = {}
): Promise<AgentResult> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const ctx: ToolContext = { snapshot, byId: new Map(snapshot.objects.map((o) => [o.id, o])) };

  const traces: AgentTrace[] = [];
  for (const req of requirements) {
    traces.push(await checkRequirement(provider, ctx, req, maxSteps));
  }

  const summary = { pass: 0, fail: 0, unmatched: 0 };
  for (const t of traces) summary[t.finding.status] += 1;

  const report: Report = {
    snapshotFile: snapshot.sourceFile,
    generatedAt: new Date().toISOString(),
    objectCount: snapshot.objects.length,
    requirementCount: requirements.length,
    summary,
    findings: traces.map((t) => t.finding),
  };

  return { report, trace: traces };
}

async function checkRequirement(
  provider: LLMProvider,
  ctx: ToolContext,
  req: Requirement,
  maxSteps: number
): Promise<AgentTrace> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: requirementPrompt(req, ctx.snapshot) },
  ];
  const steps: AgentStep[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const raw = await provider.chat(messages, { format: "json", temperature: 0 });

    let action;
    try {
      action = parseAction(raw);
    } catch (err) {
      if (err instanceof ActionParseError) {
        steps.push({ type: "error", detail: err.message });
        messages.push({ role: "assistant", content: raw });
        messages.push({ role: "user", content: `Invalid reply: ${err.message}. Respond with one JSON action only.` });
        continue;
      }
      throw err;
    }

    if (action.kind === "finish") {
      const f = action.finish;
      steps.push({ type: "finish", reasoning: f.reasoning, detail: f.status });
      return {
        requirementId: req.id,
        clause: req.clause,
        subject: req.subject,
        steps,
        finding: buildFinding(req, ctx.snapshot.units, {
          status: f.status,
          objectId: f.objectId ?? null,
          objectName: f.objectName ?? null,
          measured: f.measured ?? null,
          detail: f.reasoning ?? f.status,
        }),
      };
    }

    steps.push({ type: "action", tool: action.tool, args: action.args, reasoning: action.reasoning });

    const tool = getTool(action.tool);
    let observation: unknown;
    if (!tool) {
      observation = { error: `unknown tool "${action.tool}"` };
    } else {
      try {
        observation = tool.run(action.args, ctx);
      } catch (err) {
        observation = { error: (err as Error).message };
      }
    }

    steps.push({ type: "observation", tool: action.tool, observation });
    messages.push({ role: "assistant", content: raw });
    messages.push({ role: "user", content: `Observation: ${JSON.stringify(observation)}` });
  }

  return {
    requirementId: req.id,
    clause: req.clause,
    subject: req.subject,
    steps,
    finding: buildFinding(req, ctx.snapshot.units, {
      status: "unmatched",
      objectId: null,
      objectName: null,
      measured: null,
      detail: `agent did not conclude within ${maxSteps} steps`,
    }),
  };
}

function buildFinding(
  req: Requirement,
  modelUnit: string,
  result: {
    status: Finding["status"];
    objectId: string | null;
    objectName: string | null;
    measured: number | null;
    detail: string;
  }
): Finding {
  return {
    requirementId: req.id,
    clause: req.clause,
    sourceText: req.sourceText,
    subject: req.subject,
    parameter: req.parameter,
    operator: req.operator,
    expected: req.value,
    unit: req.unit,
    objectId: result.objectId,
    objectName: result.objectName,
    measured: result.measured,
    modelUnit,
    status: result.status,
    detail: result.detail,
  };
}
