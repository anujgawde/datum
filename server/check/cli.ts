import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { closePool } from "../db/client.js";
import { loadRequirements } from "../db/requirements.js";
import type { Requirement } from "../rag/types.js";
import { runCheck } from "./checker.js";
import type { Report, Snapshot } from "../tools/types.js";

interface Args {
  snapshotPath: string;
  requirementsPath: string | null;
  projectId: string | undefined;
  documentIds: string[] | undefined;
  requirementIds: string[] | undefined;
}

function parseList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  return items.length > 0 ? items : undefined;
}

function parseArgs(argv: string[]): Args | null {
  let snapshotPath: string | null = null;
  let requirementsPath: string | null = null;
  let projectId: string | undefined;
  let documents: string | undefined;
  let requirementIdsRaw: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--requirements") {
      requirementsPath = argv[++i] ?? null;
    } else if (argv[i] === "--project") {
      projectId = argv[++i];
    } else if (argv[i] === "--documents") {
      documents = argv[++i];
    } else if (argv[i] === "--requirement-ids") {
      requirementIdsRaw = argv[++i];
    } else if (!argv[i]!.startsWith("--")) {
      snapshotPath ??= argv[i]!;
    }
  }

  if (!snapshotPath || (requirementsPath === null && process.argv.includes("--requirements"))) {
    return null;
  }
  return {
    snapshotPath,
    requirementsPath,
    projectId,
    documentIds: parseList(documents),
    requirementIds: parseList(requirementIdsRaw),
  };
}

async function loadSnapshot(path: string): Promise<Snapshot> {
  return JSON.parse(await readFile(path, "utf8")) as Snapshot;
}

async function getRequirements(args: Args): Promise<Requirement[]> {
  if (args.requirementsPath) {
    return JSON.parse(await readFile(args.requirementsPath, "utf8")) as Requirement[];
  }
  return loadRequirements({
    projectId: args.projectId,
    documentIds: args.documentIds,
    requirementIds: args.requirementIds,
  });
}

function reportPath(snapshotPath: string): string {
  const base = snapshotPath.replace(/\.datum\.json$/i, "").replace(/\.json$/i, "");
  return join(dirname(snapshotPath), `${base.split("/").pop()}.report.json`);
}

function printReport(report: Report): void {
  console.log(`\nDatum: compliance report for ${report.snapshotFile}`);
  console.log(`  objects:      ${report.objectCount}`);
  console.log(`  requirements: ${report.requirementCount}`);
  console.log(
    `  result:       ${report.summary.pass} pass, ${report.summary.fail} fail, ` +
      `${report.summary.unmatched} unmatched\n`
  );

  for (const f of report.findings) {
    const mark = f.status === "pass" ? "PASS" : f.status === "fail" ? "FAIL" : "----";
    console.log(`  [${mark}] (${f.clause}) ${f.detail}`);
  }
  console.log("");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(
      "Usage: npm run check <snapshot.datum.json> [--requirements <file.json>] " +
        "[--project <id>] [--documents <id,id>] [--requirement-ids <id,id>]"
    );
    process.exitCode = 1;
    return;
  }

  const snapshot = await loadSnapshot(args.snapshotPath);
  const requirements = await getRequirements(args);
  const report = runCheck(snapshot, requirements);

  printReport(report);

  const outPath = reportPath(args.snapshotPath);
  await writeFile(outPath, JSON.stringify(report, null, 2));
  console.log(`Datum: report written to ${outPath}\n`);
}

main()
  .catch((err) => {
    console.error("Datum: check failed.", err);
    process.exitCode = 1;
  })
  .finally(closePool);
