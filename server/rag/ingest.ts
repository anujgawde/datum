import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api.js";

export interface Page {
  sourceFile: string;
  page: number;
  text: string;
}

export async function ingestPdf(path: string): Promise<Page[]> {
  const buffer = await readFile(path);
  const sourceFile = basename(path);

  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  const pages: Page[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = renderPage(content.items.filter(isTextItem));
    pages.push({ sourceFile, page: i, text });
  }

  await doc.destroy();
  return pages;
}

function isTextItem(item: unknown): item is TextItem {
  return typeof (item as TextItem).str === "string";
}

function renderPage(items: TextItem[]): string {
  let out = "";
  for (const item of items) {
    out += item.str;
    if (item.hasEOL) out += "\n";
    else if (out.length > 0 && !out.endsWith(" ")) out += " ";
  }
  return out;
}
