import { describe, expect, it } from "vitest";
import { chunkPages, detectClause } from "./chunk.js";
import type { Page } from "./ingest.js";

describe("detectClause", () => {
  it("detects multi-level clause numbers at the start of a line", () => {
    expect(detectClause("2.1 Exterior walls shall be 0.3 m thick.")).toBe("2.1");
    expect(detectClause("  3.2.1 Some nested clause")).toBe("3.2.1");
  });

  it("returns null when there is no leading clause number", () => {
    expect(detectClause("Exterior walls shall be thick.")).toBeNull();
    expect(detectClause("Section 2 walls")).toBeNull();
  });
});

describe("chunkPages", () => {
  const pages: Page[] = [
    {
      sourceFile: "spec.pdf",
      page: 1,
      text: "2.1 Exterior walls shall have a minimum thickness of 0.3 m.\n2.2 Walls shall be at least 3.0 m tall.",
    },
  ];

  it("produces chunks carrying page and clause metadata", () => {
    const chunks = chunkPages(pages);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]!.page).toBe(1);
    expect(chunks[0]!.sourceFile).toBe("spec.pdf");
    expect(chunks[0]!.clause).toBe("2.1");
  });

  it("assigns stable unique ids", () => {
    const chunks = chunkPages(pages);
    const ids = new Set(chunks.map((c) => c.id));
    expect(ids.size).toBe(chunks.length);
  });

  it("skips empty pages", () => {
    expect(chunkPages([{ sourceFile: "x.pdf", page: 1, text: "   \n  \n" }])).toHaveLength(0);
  });
});
