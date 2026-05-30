import { describe, expect, it } from "vitest";
import { findObjects } from "./match.js";
import type { Snapshot, SnapshotObject } from "./types.js";

function obj(name: string, layer: string): SnapshotObject {
  return {
    id: name,
    type: "Brep",
    name,
    layer,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
    dimensions: { width: 1, height: 1, depth: 1 },
  };
}

const snapshot: Snapshot = {
  version: "1.0",
  exportedAt: "",
  sourceFile: "x.3dm",
  units: "Meters",
  objects: [
    obj("Wall-Ext-01", "Exterior-Walls"),
    obj("Wall-Int-01", "Interior-Walls"),
    obj("Slab-Ground", "Slabs"),
  ],
};

describe("findObjects", () => {
  it("prefers the object matching the most subject tokens", () => {
    const matched = findObjects(snapshot, "exterior wall");
    expect(matched.map((o) => o.name)).toEqual(["Wall-Ext-01"]);
  });

  it("disambiguates interior from exterior by token score", () => {
    const matched = findObjects(snapshot, "interior partition wall");
    expect(matched.map((o) => o.name)).toEqual(["Wall-Int-01"]);
  });

  it("matches on plural layer names (slab -> Slabs)", () => {
    const matched = findObjects(snapshot, "floor slab");
    expect(matched.map((o) => o.name)).toEqual(["Slab-Ground"]);
  });

  it("returns nothing when no token matches", () => {
    expect(findObjects(snapshot, "roof truss")).toEqual([]);
  });
});
