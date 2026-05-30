import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { closePool } from "../db/client.js";
import { loadRequirements } from "../db/requirements.js";
import { getProvider } from "../llm/index.js";
import type { Requirement } from "../rag/types.js";
import type { Snapshot } from "../tools/types.js";
import { runAgent } from "./agent.js";
import type { AgentResult, AgentTrace } from "./types.js";

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

  if (!snapshotPath) return null;
  return {
    snapshotPath,
    requirementsPath,
    projectId,
    documentIds: parseList(documents),
    requirementIds: parseList(requirementIdsRaw),
  };
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

function outputPath(snapshotPath: string, suffix: string): string {
  const base = snapshotPath.replace(/\.datum\.json$/i, "").replace(/\.json$/i, "");
  return join(dirname(snapshotPath), `${base.split("/").pop()}.${suffix}`);
}

function printTrace(trace: AgentTrace): void {
  console.log(`\nRequirement ${trace.clause} (${trace.subject})`);
  for (const step of trace.steps) {
    if (step.type === "action") {
      console.log(`  > ${step.tool} ${JSON.stringify(step.args)}`);
    } else if (step.type === "observation") {
      console.log(`    ${JSON.stringify(step.observation)}`);
    } else if (step.type === "error") {
      console.log(`  ! parse error: ${step.detail}`);
    }
  }
  const mark = trace.finding.status.toUpperCase();
  console.log(`  = ${mark}: ${trace.finding.detail}`);
}

function printSummary(result: AgentResult): void {
  const { report } = result;
  console.log(`\nDatum: agentic compliance report for ${report.snapshotFile}`);
  console.log(`  objects:      ${report.objectCount}`);
  console.log(`  requirements: ${report.requirementCount}`);
  console.log(
    `  result:       ${report.summary.pass} pass, ${report.summary.fail} fail, ` +
      `${report.summary.unmatched} unmatched\n`
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(
      "Usage: npm run agent <snapshot.datum.json> [--requirements <file.json>] " +
        "[--project <id>] [--documents <id,id>] [--requirement-ids <id,id>]"
    );
    process.exitCode = 1;
    return;
  }

  const snapshot = JSON.parse(await readFile(args.snapshotPath, "utf8")) as Snapshot;
  const requirements = await getRequirements(args);

  const result = await runAgent(getProvider(), snapshot, requirements);

  for (const trace of result.trace) printTrace(trace);
  printSummary(result);

  await writeFile(outputPath(args.snapshotPath, "report.json"), JSON.stringify(result.report, null, 2));
  await writeFile(outputPath(args.snapshotPath, "trace.json"), JSON.stringify(result.trace, null, 2));
  console.log(`Datum: report and trace written next to ${args.snapshotPath}\n`);
}

main()
  .catch((err) => {
    console.error("Datum: agent run failed.", err);
    process.exitCode = 1;
  })
  .finally(closePool);
