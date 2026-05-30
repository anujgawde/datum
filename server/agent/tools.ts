import {
  convert,
  evaluate as evaluateCompare,
  findObjects,
  measure as measureObject,
  measureSpacing,
} from "../tools/index.js";
import type { Snapshot, SnapshotObject } from "../tools/types.js";

export interface ToolContext {
  snapshot: Snapshot;
  byId: Map<string, SnapshotObject>;
}

export interface AgentTool {
  name: string;
  description: string;
  run(args: Record<string, unknown>, ctx: ToolContext): unknown;
}

function asString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`"${key}" must be a non-empty string`);
  }
  return value;
}

function asNumber(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`"${key}" must be a number`);
  }
  return value;
}

function summarize(obj: SnapshotObject) {
  return { id: obj.id, name: obj.name, layer: obj.layer, dimensions: obj.dimensions };
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "find_objects",
    description:
      'find_objects({ "subject": string }) -> candidate model objects whose layer/name best match the subject. Returns [] if none match.',
    run(args, ctx) {
      const subject = asString(args, "subject");
      return { matches: findObjects(ctx.snapshot, subject).map(summarize) };
    },
  },
  {
    name: "measure",
    description:
      'measure({ "objectId": string, "parameter": "height"|"width"|"depth"|"thickness" }) -> { value, unit } in model units. value is null if the parameter is not measurable.',
    run(args, ctx) {
      const objectId = asString(args, "objectId");
      const parameter = asString(args, "parameter");
      const obj = ctx.byId.get(objectId);
      if (!obj) throw new Error(`no object with id "${objectId}"`);
      return { value: measureObject(obj, parameter), unit: ctx.snapshot.units };
    },
  },
  {
    name: "measure_spacing",
    description:
      'measure_spacing({ "objectIds": string[] }) -> { value, unit }: the largest centre-to-centre distance to a nearest neighbour. value is null with fewer than two objects.',
    run(args, ctx) {
      const ids = args["objectIds"];
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
        throw new Error('"objectIds" must be an array of strings');
      }
      const objects: SnapshotObject[] = [];
      for (const id of ids as string[]) {
        const obj = ctx.byId.get(id);
        if (!obj) throw new Error(`no object with id "${id}"`);
        objects.push(obj);
      }
      return { value: measureSpacing(objects), unit: ctx.snapshot.units };
    },
  },
  {
    name: "evaluate",
    description:
      'evaluate({ "measured": number, "measuredUnit": string, "operator": ">="|"<="|"=="|"between", "expected": number | [number, number], "expectedUnit": string }) -> { pass: boolean }. Converts units before comparing.',
    run(args) {
      const measured = asNumber(args, "measured");
      const measuredUnit = asString(args, "measuredUnit");
      const operator = asString(args, "operator");
      const expectedUnit = asString(args, "expectedUnit");
      const expected = args["expected"];

      const measuredInExpected = convert(measured, measuredUnit, expectedUnit);
      if (typeof expected === "number") {
        return { pass: evaluateCompare(measuredInExpected, operator, expected) };
      }
      if (Array.isArray(expected) && expected.length === 2) {
        return {
          pass: evaluateCompare(measuredInExpected, operator, [
            Number(expected[0]),
            Number(expected[1]),
          ]),
        };
      }
      throw new Error('"expected" must be a number or [number, number]');
    },
  },
];

export function getTool(name: string): AgentTool | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}
