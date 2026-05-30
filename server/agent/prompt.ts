import type { Requirement } from "../rag/types.js";
import type { Snapshot } from "../tools/types.js";
import { AGENT_TOOLS } from "./tools.js";

export function systemPrompt(): string {
  const tools = AGENT_TOOLS.map((t) => `- ${t.description}`).join("\n");
  return `You verify ONE structural requirement against a 3D building model by calling tools.

You THINK; the tools ACT. You never compute results yourself - use the tools for every
fact and for the final pass/fail decision.

Available tools:
${tools}

Respond with EXACTLY ONE JSON object per turn, nothing else. Either call a tool:
  {"reasoning": "<short why>", "tool": "<name>", "args": { ... }}
or finish the requirement:
  {"finish": {"status": "pass"|"fail"|"unmatched", "objectId": <id or null>,
              "objectName": <name or null>, "measured": <number or null>,
              "unit": "<unit>", "reasoning": "<short why>"}}

Workflow:
1. find_objects with the requirement's subject. If nothing matches, finish as "unmatched".
2. For a per-object parameter, measure the matched object. For a spacing/layout parameter,
   use measure_spacing over the matched objects' ids.
3. Call evaluate with the measured value/unit, the requirement operator, and expected
   value/unit to get the deterministic verdict.
4. finish with that verdict ("pass" or "fail"). If a requirement matches several objects,
   verify each and fail if any object fails.

Keep reasoning to one short sentence.`;
}

export function requirementPrompt(req: Requirement, snapshot: Snapshot): string {
  const expected = Array.isArray(req.value) ? `[${req.value[0]}, ${req.value[1]}]` : req.value;
  const objects = snapshot.objects
    .map(
      (o) =>
        `  - id=${o.id} name="${o.name}" layer="${o.layer}" ` +
        `dimensions(w=${o.dimensions.width}, h=${o.dimensions.height}, d=${o.dimensions.depth})`
    )
    .join("\n");

  return `Model units: ${snapshot.units}
Model objects:
${objects}

Requirement (clause ${req.clause}):
  subject:   ${req.subject}
  parameter: ${req.parameter}
  operator:  ${req.operator}
  expected:  ${expected} ${req.unit}
  text:      "${req.sourceText}"

Verify this requirement.`;
}
