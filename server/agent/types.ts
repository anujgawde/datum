import type { Finding, Report } from "../tools/types.js";

export type AgentStepType = "action" | "observation" | "finish" | "error";

export interface AgentStep {
  type: AgentStepType;
  tool?: string;
  args?: Record<string, unknown>;
  observation?: unknown;
  reasoning?: string;
  detail?: string;
}

export interface AgentTrace {
  requirementId: string;
  clause: string;
  subject: string;
  steps: AgentStep[];
  finding: Finding;
}

export interface AgentResult {
  report: Report;
  trace: AgentTrace[];
}
