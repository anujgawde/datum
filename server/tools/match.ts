import type { Snapshot, SnapshotObject } from "./types.js";

const STOPWORDS = new Set(["the", "a", "an", "of", "and", "or", "shall", "be", "all"]);

function stem(token: string): string {
  if (token.length > 3 && token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.length > 2 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map(stem);
}

function scoreObject(subjectTokens: string[], obj: SnapshotObject): number {
  const objTokens = new Set([...tokenize(obj.layer), ...tokenize(obj.name)]);
  let score = 0;
  for (const token of subjectTokens) {
    if (objTokens.has(token)) score += 1;
  }
  return score;
}

export function findObjects(snapshot: Snapshot, subject: string): SnapshotObject[] {
  const subjectTokens = tokenize(subject);
  if (subjectTokens.length === 0) return [];

  const scored = snapshot.objects.map((obj) => ({ obj, score: scoreObject(subjectTokens, obj) }));
  const maxScore = Math.max(0, ...scored.map((s) => s.score));
  if (maxScore === 0) return [];

  return scored.filter((s) => s.score === maxScore).map((s) => s.obj);
}
