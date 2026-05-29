import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Requirement } from "../../rag/types.js";
import type { Snapshot } from "../../tools/types.js";
import { CheckService } from "./check.service.js";

function loadFixture<T>(name: string): T {
  const url = new URL(`../../fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as T;
}

const snapshot = loadFixture<Snapshot>("sample-model.datum.json");
const requirements = loadFixture<Requirement[]>("sample-requirements.json");

describe("CheckService", () => {
  const service = new CheckService();

  it("runs a deterministic check from an inline request (no DB/LLM)", async () => {
    const res = await service.check({ snapshot, requirements, mode: "deterministic" });
    expect(res.report.summary).toEqual({ pass: 5, fail: 2, unmatched: 1 });
    expect(res.trace).toBeUndefined();
  });

  it("defaults to deterministic mode when none is given", async () => {
    const res = await service.check({ snapshot, requirements });
    expect(res.report.requirementCount).toBe(7);
  });

  it("rejects a malformed request", async () => {
    await expect(service.check({ snapshot: { units: "Meters" } })).rejects.toThrow();
  });
});
