import { describe, expect, it } from "vitest";
import { requirementListSchema, requirementSchema } from "./types.js";

describe("requirementSchema", () => {
  it("accepts a single-value dimensional requirement", () => {
    const result = requirementSchema.safeParse({
      category: "dimensional",
      subject: "exterior wall",
      parameter: "thickness",
      operator: ">=",
      value: 0.3,
      unit: "m",
      clause: "2.1",
      sourceText: "Exterior walls shall have a minimum thickness of 0.3 m.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a between requirement with a tuple value", () => {
    const result = requirementSchema.safeParse({
      category: "dimensional",
      subject: "floor-to-ceiling",
      parameter: "height",
      operator: "between",
      value: [2.7, 3.6],
      unit: "m",
      clause: "3.2",
      sourceText: "Clear height shall be between 2.7 m and 3.6 m.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = requirementSchema.safeParse({
      category: "fire-rating",
      subject: "wall",
      parameter: "rating",
      operator: ">=",
      value: 2,
      unit: "hr",
      clause: "5.1",
      sourceText: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid operator", () => {
    const result = requirementSchema.safeParse({
      category: "dimensional",
      subject: "wall",
      parameter: "height",
      operator: "approximately",
      value: 3,
      unit: "m",
      clause: "2.2",
      sourceText: "x",
    });
    expect(result.success).toBe(false);
  });

  it("parses a wrapper object with a requirements array", () => {
    const result = requirementListSchema.safeParse({ requirements: [] });
    expect(result.success).toBe(true);
  });
});
