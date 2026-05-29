import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ChatMessage, LLMProvider } from "../llm/index.js";
import type { Requirement } from "../rag/types.js";
import type { Snapshot } from "../tools/types.js";
import { runAgent } from "./agent.js";

function loadFixture<T>(name: string): T {
  const url = new URL(`../fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as T;
}

const snapshot = loadFixture<Snapshot>("sample-model.datum.json");
const allReqs = loadFixture<Requirement[]>("sample-requirements.json");
const byId = (id: string) => allReqs.find((r) => r.id === id)!;

const WALL_EXT = "11111111-1111-1111-1111-111111111111";
const WALL_INT = "22222222-2222-2222-2222-222222222222";

class FakeProvider implements LLMProvider {
  readonly chatModel = "fake";
  readonly embedModel = "fake";
  private replies: string[];

  constructor(replies: unknown[]) {
    this.replies = replies.map((r) => JSON.stringify(r));
  }

  async chat(_messages: ChatMessage[]): Promise<string> {
    const reply = this.replies.shift();
    if (reply === undefined) throw new Error("FakeProvider ran out of scripted replies");
    return reply;
  }

  async embed(): Promise<number[][]> {
    throw new Error("not used");
  }
}

const script = [
  // req-2-1 exterior wall thickness >= 0.3 -> pass
  { tool: "find_objects", args: { subject: "exterior wall" } },
  { tool: "measure", args: { objectId: WALL_EXT, parameter: "thickness" } },
  { tool: "evaluate", args: { measured: 0.3, measuredUnit: "Meters", operator: ">=", expected: 0.3, expectedUnit: "m" } },
  { finish: { status: "pass", objectId: WALL_EXT, objectName: "Wall-Ext-01", measured: 0.3, unit: "m", reasoning: "thickness meets minimum" } },
  // req-2-3 interior partition thickness <= 0.15 -> fail
  { tool: "find_objects", args: { subject: "interior partition wall" } },
  { tool: "measure", args: { objectId: WALL_INT, parameter: "thickness" } },
  { tool: "evaluate", args: { measured: 0.2, measuredUnit: "Meters", operator: "<=", expected: 0.15, expectedUnit: "m" } },
  { finish: { status: "fail", objectId: WALL_INT, objectName: "Wall-Int-01", measured: 0.2, unit: "m", reasoning: "too thick" } },
  // req-3-2 floor-to-ceiling -> unmatched
  { tool: "find_objects", args: { subject: "floor-to-ceiling" } },
  { finish: { status: "unmatched", objectId: null, measured: null, unit: "m", reasoning: "no matching element" } },
];

describe("runAgent", () => {
  const requirements = [byId("req-2-1"), byId("req-2-3"), byId("req-3-2")];

  it("drives the loop and assembles a report from the agent's verdicts", async () => {
    const result = await runAgent(new FakeProvider(script), snapshot, requirements);

    expect(result.report.summary).toEqual({ pass: 1, fail: 1, unmatched: 1 });
    expect(result.report.requirementCount).toBe(3);
    expect(result.report.findings).toHaveLength(3);
  });

  it("traces findings back to clause and model element", async () => {
    const { trace } = await runAgent(new FakeProvider(script), snapshot, requirements);

    const pass = trace.find((t) => t.requirementId === "req-2-1")!;
    expect(pass.finding.status).toBe("pass");
    expect(pass.finding.clause).toBe("2.1");
    expect(pass.finding.objectId).toBe(WALL_EXT);
  });

  it("actually executes the tools (real find_objects + evaluate observations)", async () => {
    const { trace } = await runAgent(new FakeProvider(script), snapshot, requirements);
    const pass = trace.find((t) => t.requirementId === "req-2-1")!;

    const findObs = pass.steps.find((s) => s.type === "observation" && s.tool === "find_objects");
    expect((findObs?.observation as { matches: { name: string }[] }).matches[0]!.name).toBe("Wall-Ext-01");

    const evalObs = pass.steps.find((s) => s.type === "observation" && s.tool === "evaluate");
    expect((evalObs?.observation as { pass: boolean }).pass).toBe(true);
  });

  it("concludes unmatched without measuring when nothing matches", async () => {
    const { trace } = await runAgent(new FakeProvider(script), snapshot, requirements);
    const unmatched = trace.find((t) => t.requirementId === "req-3-2")!;

    expect(unmatched.finding.status).toBe("unmatched");
    expect(unmatched.finding.objectId).toBeNull();
    expect(unmatched.steps.some((s) => s.type === "action" && s.tool === "measure")).toBe(false);
  });

  it("gives up gracefully when the agent never concludes", async () => {
    const loopingScript = Array(20).fill({ tool: "find_objects", args: { subject: "wall" } });
    const result = await runAgent(new FakeProvider(loopingScript), snapshot, [byId("req-2-1")], { maxSteps: 4 });

    expect(result.report.summary.unmatched).toBe(1);
    expect(result.trace[0]!.finding.detail).toContain("did not conclude");
  });
});
