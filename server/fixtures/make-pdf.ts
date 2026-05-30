import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

async function makePdf(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const md = await readFile(join(here, "sample-spec.md"), "utf8");
  const outDir = join(here, "..", "uploads", "sample", "sample");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "sample-spec.pdf");

  const doc = new PDFDocument({ margin: 64 });
  const stream = createWriteStream(outPath);
  doc.pipe(stream);

  doc.font("Helvetica").fontSize(11);
  for (const line of md.split("\n")) {
    if (line.startsWith("# ")) {
      doc.moveDown(0.5).fontSize(16).text(line.slice(2)).fontSize(11).moveDown(0.5);
    } else if (line.startsWith("## ")) {
      doc.moveDown(0.5).fontSize(13).text(line.slice(3)).fontSize(11).moveDown(0.3);
    } else if (line.trim().length === 0) {
      doc.moveDown(0.3);
    } else {
      doc.text(line);
    }
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  console.log(`Datum: wrote ${outPath}`);
}

makePdf().catch((err) => {
  console.error("Datum: PDF generation failed.", err);
  process.exitCode = 1;
});
