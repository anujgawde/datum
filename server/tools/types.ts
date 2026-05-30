export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SnapshotObject {
  id: string;
  type: string;
  name: string;
  layer: string;
  boundingBox: { min: Vector3; max: Vector3 };
  dimensions: { width: number; height: number; depth: number };
}

export interface Snapshot {
  version: string;
  exportedAt: string;
  sourceFile: string;
  units: string;
  objects: SnapshotObject[];
}

export type FindingStatus = "pass" | "fail" | "unmatched";

export interface Finding {
  requirementId: string;
  clause: string;
  sourceText: string;
  subject: string;
  parameter: string;
  operator: string;
  expected: number | [number, number];
  unit: string;
  objectId: string | null;
  objectName: string | null;
  measured: number | null;
  modelUnit: string;
  status: FindingStatus;
  detail: string;
}

export interface Report {
  snapshotFile: string;
  generatedAt: string;
  objectCount: number;
  requirementCount: number;
  summary: { pass: number; fail: number; unmatched: number };
  findings: Finding[];
}
