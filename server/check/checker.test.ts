import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCheck } from "./checker.js";
import type { Requirement } from "../rag/types.js";
import type { Snapshot } from "../tools/types.js";

function loadFixture<T>(name: string): T {
  const url = new URL(`../fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as T;
}

const snapshot = loadFixture<Snapshot>("sample-model.datum.json");
const requirements = loadFixture<Requirement[]>("sample-requirements.json");

describe("runCheck", () => {
  const report = runCheck(snapshot, requirements);

  it("produces the expected pass/fail/unmatched mix", () => {
    expect(report.summary).toEqual({ pass: 5, fail: 2, unmatched: 1 });
  });

  it("counts requirements and objects", () => {
    expect(report.requirementCount).toBe(7);
    expect(report.objectCount).toBe(5);
  });

  it("traces a passing finding to its clause and model element", () => {
    const f = report.findings.find((x) => x.requirementId === "req-2-1");
    expect(f?.status).toBe("pass");
    expect(f?.clause).toBe("2.1");
    expect(f?.objectId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("flags the too-thin partition as a failure", () => {
    const f = report.findings.find((x) => x.requirementId === "req-2-3");
    expect(f?.status).toBe("fail");
    expect(f?.measured).toBe(0.2);
  });

  it("flags an over-wide column spacing as a failure", () => {
    const f = report.findings.find((x) => x.requirementId === "req-4-1");
    expect(f?.status).toBe("fail");
    expect(f?.measured).toBeCloseTo(7);
  });

  it("reports an unmatched requirement when no object fits", () => {
    const f = report.findings.find((x) => x.requirementId === "req-3-2");
    expect(f?.status).toBe("unmatched");
    expect(f?.objectId).toBeNull();
  });

  it("emits one finding per matched object for per-object parameters", () => {
    const columnWidth = report.findings.filter((x) => x.requirementId === "req-4-2");
    expect(columnWidth).toHaveLength(2);
    expect(columnWidth.every((x) => x.status === "pass")).toBe(true);
  });
});
