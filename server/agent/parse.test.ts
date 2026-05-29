import { describe, expect, it } from "vitest";
import { ActionParseError, parseAction } from "./parse.js";

describe("parseAction", () => {
  it("parses a clean tool action", () => {
    const a = parseAction('{"tool": "find_objects", "args": {"subject": "wall"}}');
    expect(a).toEqual({ kind: "tool", tool: "find_objects", args: { subject: "wall" }, reasoning: undefined });
  });

  it("parses a finish action", () => {
    const a = parseAction('{"finish": {"status": "pass", "measured": 0.3, "unit": "m"}}');
    expect(a.kind).toBe("finish");
    if (a.kind === "finish") expect(a.finish.status).toBe("pass");
  });

  it("tolerates code fences and surrounding prose", () => {
    const raw = 'Sure, here is my action:\n```json\n{"tool": "measure", "args": {"objectId": "x", "parameter": "height"}}\n```';
    const a = parseAction(raw);
    expect(a.kind).toBe("tool");
    if (a.kind === "tool") expect(a.tool).toBe("measure");
  });

  it("handles nested braces in args", () => {
    const a = parseAction('{"tool": "evaluate", "args": {"expected": [2.7, 3.6]}}');
    expect(a.kind).toBe("tool");
    if (a.kind === "tool") expect(a.args["expected"]).toEqual([2.7, 3.6]);
  });

  it("throws on missing JSON", () => {
    expect(() => parseAction("no json here")).toThrow(ActionParseError);
  });

  it("throws on a shape that is neither tool nor finish", () => {
    expect(() => parseAction('{"foo": "bar"}')).toThrow(ActionParseError);
  });
});
