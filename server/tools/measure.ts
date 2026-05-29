import type { SnapshotObject } from "./types.js";

const EPSILON = 1e-6;

const UNIT_TO_METERS: Record<string, number> = {
  m: 1, meter: 1, meters: 1, metre: 1, metres: 1,
  mm: 0.001, millimeter: 0.001, millimeters: 0.001, millimetre: 0.001, millimetres: 0.001,
  cm: 0.01, centimeter: 0.01, centimeters: 0.01, centimetre: 0.01, centimetres: 0.01,
  ft: 0.3048, foot: 0.3048, feet: 0.3048,
  in: 0.0254, inch: 0.0254, inches: 0.0254,
};

export function unitToMeters(unit: string): number {
  const factor = UNIT_TO_METERS[unit.trim().toLowerCase()];
  if (factor === undefined) throw new Error(`Unknown unit: ${unit}`);
  return factor;
}

export function convert(value: number, fromUnit: string, toUnit: string): number {
  return (value * unitToMeters(fromUnit)) / unitToMeters(toUnit);
}

export function isLayoutParameter(parameter: string): boolean {
  const p = parameter.trim().toLowerCase();
  return p.startsWith("spac");
}

export function measure(object: SnapshotObject, parameter: string): number | null {
  const { width, height, depth } = object.dimensions;
  switch (parameter.trim().toLowerCase()) {
    case "height":
      return height;
    case "width":
      return width;
    case "depth":
      return depth;
    case "thickness":
      return Math.min(width, height, depth);
    default:
      return null;
  }
}

export function measureSpacing(objects: SnapshotObject[]): number | null {
  if (objects.length < 2) return null;

  const centers = objects.map((o) => ({
    x: (o.boundingBox.min.x + o.boundingBox.max.x) / 2,
    y: (o.boundingBox.min.y + o.boundingBox.max.y) / 2,
  }));

  let maxNearest = 0;
  for (let i = 0; i < centers.length; i++) {
    let nearest = Infinity;
    for (let j = 0; j < centers.length; j++) {
      if (i === j) continue;
      const dx = centers[i]!.x - centers[j]!.x;
      const dy = centers[i]!.y - centers[j]!.y;
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    maxNearest = Math.max(maxNearest, nearest);
  }
  return maxNearest;
}

export function evaluate(
  measured: number,
  operator: string,
  expected: number | [number, number]
): boolean {
  switch (operator) {
    case ">=":
      return measured >= (expected as number) - EPSILON;
    case "<=":
      return measured <= (expected as number) + EPSILON;
    case "==":
      return Math.abs(measured - (expected as number)) <= EPSILON;
    case "between": {
      const [low, high] = expected as [number, number];
      return measured >= low - EPSILON && measured <= high + EPSILON;
    }
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}
