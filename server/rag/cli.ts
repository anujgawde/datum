import "dotenv/config";
import { closePool } from "../db/client.js";
import { runPipeline } from "./pipeline.js";

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npm run extract <spec.pdf>");
    process.exitCode = 1;
    return;
  }

  const result = await runPipeline(pdfPath);

  console.log(`\nDatum: extracted from ${result.sourceFile}`);
  console.log(`  pages:        ${result.pageCount}`);
  console.log(`  chunks:       ${result.chunkCount}`);
  console.log(`  requirements: ${result.requirements.length}\n`);

  for (const req of result.requirements) {
    const value = Array.isArray(req.value) ? `${req.value[0]}-${req.value[1]}` : req.value;
    console.log(
      `  [${req.clause} p${req.sourcePage}] ${req.subject} ${req.parameter} ` +
        `${req.operator} ${value} ${req.unit}`
    );
  }
  console.log("");
}

main()
  .catch((err) => {
    console.error("Datum: extraction failed.", err);
    process.exitCode = 1;
  })
  .finally(closePool);
