import { describe, expect, it } from "vitest";
import { convert, evaluate, isLayoutParameter, measure, measureSpacing } from "./measure.js";
import type { SnapshotObject } from "./types.js";

function makeObject(width: number, height: number, depth: number, x = 0): SnapshotObject {
  return {
    id: `o${x}`,
    type: "Brep",
    name: `o${x}`,
    layer: "L",
    boundingBox: { min: { x, y: 0, z: 0 }, max: { x: x + width, y: depth, z: height } },
    dimensions: { width, height, depth },
  };
}

describe("measure", () => {
  const wall = makeObject(5, 3.2, 0.3);

  it("maps named parameters to dimensions", () => {
    expect(measure(wall, "height")).toBe(3.2);
    expect(measure(wall, "width")).toBe(5);
    expect(measure(wall, "depth")).toBe(0.3);
  });

  it("treats thickness as the smallest extent", () => {
    expect(measure(wall, "thickness")).toBe(0.3);
    expect(measure(makeObject(10, 0.25, 8), "thickness")).toBe(0.25);
  });

  it("returns null for unknown parameters", () => {
    expect(measure(wall, "fire-rating")).toBeNull();
  });
});

describe("measureSpacing", () => {
  it("returns the max nearest-neighbour centre distance", () => {
    const cols = [makeObject(0.4, 3, 0.4, 0), makeObject(0.4, 3, 0.4, 7)];
    expect(measureSpacing(cols)).toBeCloseTo(7);
  });

  it("returns null with fewer than two objects", () => {
    expect(measureSpacing([makeObject(0.4, 3, 0.4)])).toBeNull();
  });
});

describe("convert", () => {
  it("converts between units via metres", () => {
    expect(convert(300, "mm", "m")).toBeCloseTo(0.3);
    expect(convert(0.3, "Meters", "mm")).toBeCloseTo(300);
  });

  it("throws on an unknown unit", () => {
    expect(() => convert(1, "furlong", "m")).toThrow();
  });
});

describe("evaluate", () => {
  it("handles comparison operators", () => {
    expect(evaluate(0.3, ">=", 0.3)).toBe(true);
    expect(evaluate(0.2, "<=", 0.15)).toBe(false);
    expect(evaluate(3.0, "==", 3.0)).toBe(true);
  });

  it("handles between with a tuple", () => {
    expect(evaluate(3.0, "between", [2.7, 3.6])).toBe(true);
    expect(evaluate(4.0, "between", [2.7, 3.6])).toBe(false);
  });
});

describe("isLayoutParameter", () => {
  it("recognises spacing", () => {
    expect(isLayoutParameter("spacing")).toBe(true);
    expect(isLayoutParameter("height")).toBe(false);
  });
});
