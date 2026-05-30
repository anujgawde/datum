import type { Requirement } from "../rag/types.js";
import {
  convert,
  evaluate,
  findObjects,
  isLayoutParameter,
  measure,
  measureSpacing,
} from "../tools/index.js";
import type { Finding, Report, Snapshot, SnapshotObject } from "../tools/types.js";

export function runCheck(snapshot: Snapshot, requirements: Requirement[]): Report {
  const findings: Finding[] = [];

  for (const req of requirements) {
    const matched = findObjects(snapshot, req.subject);

    if (matched.length === 0) {
      findings.push(unmatched(req, null, `no model object matched "${req.subject}"`));
      continue;
    }

    if (isLayoutParameter(req.parameter)) {
      findings.push(checkSpacing(req, matched, snapshot.units));
      continue;
    }

    for (const obj of matched) {
      findings.push(checkObject(req, obj, snapshot.units));
    }
  }

  const summary = { pass: 0, fail: 0, unmatched: 0 };
  for (const f of findings) summary[f.status] += 1;

  return {
    snapshotFile: snapshot.sourceFile,
    generatedAt: new Date().toISOString(),
    objectCount: snapshot.objects.length,
    requirementCount: requirements.length,
    summary,
    findings,
  };
}

function checkObject(req: Requirement, obj: SnapshotObject, modelUnit: string): Finding {
  const raw = measure(obj, req.parameter);
  if (raw === null) {
    return unmatched(req, obj, `cannot measure "${req.parameter}" on ${obj.name || obj.id}`);
  }

  let measured: number;
  try {
    measured = convert(raw, modelUnit, req.unit);
  } catch (err) {
    return unmatched(req, obj, (err as Error).message);
  }

  const ok = evaluate(measured, req.operator, req.value);
  return finding(req, obj, measured, modelUnit, ok ? "pass" : "fail");
}

function checkSpacing(req: Requirement, objects: SnapshotObject[], modelUnit: string): Finding {
  const raw = measureSpacing(objects);
  if (raw === null) {
    return unmatched(req, null, `need at least 2 objects to measure spacing for "${req.subject}"`);
  }

  let measured: number;
  try {
    measured = convert(raw, modelUnit, req.unit);
  } catch (err) {
    return unmatched(req, null, (err as Error).message);
  }

  const ok = evaluate(measured, req.operator, req.value);
  const f = finding(req, null, measured, modelUnit, ok ? "pass" : "fail");
  f.objectName = `${objects.length} matched objects`;
  return f;
}

function finding(
  req: Requirement,
  obj: SnapshotObject | null,
  measured: number,
  modelUnit: string,
  status: "pass" | "fail"
): Finding {
  const verb = status === "pass" ? "satisfies" : "violates";
  const value = `${round(measured)} ${req.unit}`;
  const expected = `${formatExpected(req.value)} ${req.unit}`;
  return {
    requirementId: req.id,
    clause: req.clause,
    sourceText: req.sourceText,
    subject: req.subject,
    parameter: req.parameter,
    operator: req.operator,
    expected: req.value,
    unit: req.unit,
    objectId: obj?.id ?? null,
    objectName: obj?.name || obj?.id || null,
    measured: round(measured),
    modelUnit,
    status,
    detail: `${req.subject} ${req.parameter} = ${value} ${verb} ${req.operator} ${expected}`,
  };
}

function unmatched(req: Requirement, obj: SnapshotObject | null, detail: string): Finding {
  return {
    requirementId: req.id,
    clause: req.clause,
    sourceText: req.sourceText,
    subject: req.subject,
    parameter: req.parameter,
    operator: req.operator,
    expected: req.value,
    unit: req.unit,
    objectId: obj?.id ?? null,
    objectName: obj?.name || obj?.id || null,
    measured: null,
    modelUnit: "",
    status: "unmatched",
    detail,
  };
}

function formatExpected(value: number | [number, number]): string {
  return Array.isArray(value) ? `${value[0]}-${value[1]}` : `${value}`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
