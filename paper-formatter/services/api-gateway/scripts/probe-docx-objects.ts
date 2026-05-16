/**
 * PR #1 DOCX object probe wrapper.
 * The XML traversal now lives in src/parser/docx-object-extractor.ts so probe
 * evidence and PR #3 source extraction share one implementation path.
 * This script only formats compact evidence JSON and markdown reports.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractDocxObjectsFromDocxPath,
  type DocxObjectExtraction,
  type ExtractedCaptionCandidate,
} from "../src/parser/docx-object-extractor.js";

export interface ProbeOutput {
  docxPath: string;
  stats: DocxObjectExtraction["stats"];
  tables: Array<{
    startParagraphIndex: number;
    endParagraphIndex: number;
    rowCount: number;
    columnCount: number;
    hasTblHeaderInFirstRow: boolean;
    tblLookAttributes: Record<string, string>;
    firstRowText: string[];
    headerRowTextHash: string;
  }>;
  drawings: Array<{
    anchorParagraphIndex: number;
    wrapMode: string;
    relationshipId: string;
    isInline: boolean;
  }>;
  captionCandidates: Array<{
    paragraphIndex: number;
    text: string;
    styleName: string;
    matchedPattern: "figure" | "table" | "continuation" | "none";
    numberToken: string;
  }>;
  adjacentTablePairs: Array<{
    prevTableIndex: number;
    currTableIndex: number;
    paragraphsBetween: Array<{ paragraphIndex: number; text: string }>;
    captionsBetween: ProbeOutput["captionCandidates"];
  }>;
}

export async function probeDocxObjects(docxPath: string): Promise<ProbeOutput> {
  return toProbeOutput(await extractDocxObjectsFromDocxPath(docxPath), docxPath);
}

function toProbeOutput(extraction: DocxObjectExtraction, docxPath: string): ProbeOutput {
  const captionCandidates = extraction.captionCandidates.map(toProbeCaption);
  return {
    docxPath,
    stats: extraction.stats,
    tables: extraction.tables.map((table) => ({
      startParagraphIndex: table.startParagraphIndex,
      endParagraphIndex: table.endParagraphIndex,
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      hasTblHeaderInFirstRow: table.hasTblHeaderInFirstRow,
      tblLookAttributes: table.tblLookAttributes,
      firstRowText: table.firstRowText,
      headerRowTextHash: table.headerRowTextHash,
    })),
    drawings: extraction.drawings.map((drawing) => ({
      anchorParagraphIndex: drawing.anchorParagraphIndex,
      wrapMode: drawing.wrapMode,
      relationshipId: drawing.relationshipId,
      isInline: drawing.isInline,
    })),
    captionCandidates,
    adjacentTablePairs: extraction.adjacentTablePairs.map((pair) => ({
      prevTableIndex: pair.prevTableIndex,
      currTableIndex: pair.currTableIndex,
      paragraphsBetween: pair.paragraphsBetween,
      captionsBetween: pair.captionsBetween.map(toProbeCaption),
    })),
  };
}

function toProbeCaption(caption: ExtractedCaptionCandidate): ProbeOutput["captionCandidates"][number] {
  return {
    paragraphIndex: caption.paragraphIndex,
    text: caption.text,
    styleName: caption.styleName,
    matchedPattern: caption.matchedPattern,
    numberToken: caption.numberToken,
  };
}

export function buildSummaryReport(outputs: ProbeOutput[]): string {
  const metrics = collectSummaryMetrics(outputs);
  const lines: string[] = [];
  lines.push("# PR #1 DOCX Object Probe Summary");
  lines.push("");
  lines.push("## Samples");
  for (const output of outputs) {
    lines.push(
      `- ${path.basename(output.docxPath)}: paragraphs=${output.stats.paragraphCount}, tables=${output.stats.tableCount}, drawings=${output.stats.drawingCount}, captions=${output.stats.captionCandidateCount}`,
    );
  }
  lines.push("");
  lines.push("## Key Findings");
  lines.push(`- w:tblHeader actual rate: ${metrics.tblHeaderCount}/${metrics.tableCount} tables.`);
  lines.push(`- w:tblLook distribution: ${formatDistribution(metrics.tblLookDistribution)}.`);
  lines.push(`- caption style distribution: ${formatDistribution(metrics.captionStyleDistribution)}.`);
  lines.push(`- continuation caption candidates: ${metrics.continuationCaptionCount}.`);
  lines.push(`- w:drawing wrapMode distribution: ${formatDistribution(metrics.wrapModeDistribution)}.`);
  lines.push("");
  lines.push("## PR #2 IR Schema Correction Proposal");
  lines.push("- TableObject should include startParagraphIndex, endParagraphIndex, rowCount, columnCount, hasTblHeaderInFirstRow, tblLookAttributes, firstRowText, and headerRowTextHash because these fields are present in the probe outputs and are required by continuation voting.");
  lines.push("- FigureObject should include anchorParagraphIndex, isInline, wrapMode, and relationshipId because the probe outputs expose drawing placement and wrapping independently from paragraph text.");
  lines.push("- CaptionNode should include paragraphIndex, text, styleName, matchedPattern, and numberToken because caption detection evidence comes from paragraph text plus paragraph style.");
  lines.push("- Adjacent table evidence should include paragraphsBetween and captionsBetween because continuation voting needs the gap between neighboring table objects.");
  lines.push("");
  lines.push("## Q4/Q5/Q6 Recommendations");
  lines.push(`- Q4 continuation threshold: keep default score >=3 as confirmed edge, score=2 as warning, score<=1 as no edge. Evidence: ${metrics.tblHeaderCount}/${metrics.tableCount} tables have w:tblHeader, so structural signals are not guaranteed on every table.`);
  lines.push("- Q5 continues edge direction: keep continuation table -> main table. Evidence: adjacentTablePairs are emitted as prev/curr pairs, so a current table can point backward to the earlier table without mutating the main table node.");
  lines.push("- Q6 invariant violation handling: inject warnings into ObjectGraph rather than throwing. Evidence: real samples include varying style/wrap/table metadata, and PR #1 is a read-only probe intended to preserve downstream fallback.");
  return lines.join("\n");
}

export function buildIrProposal(outputs: ProbeOutput[]): string {
  const tableCount = outputs.reduce((sum, output) => sum + output.stats.tableCount, 0);
  const drawingCount = outputs.reduce((sum, output) => sum + output.stats.drawingCount, 0);
  const captionCount = outputs.reduce((sum, output) => sum + output.stats.captionCandidateCount, 0);
  return [
    "# PR #2 IR Schema Correction Proposal",
    "",
    "## Evidence Inputs",
    `- Samples: ${outputs.length}`,
    `- Tables: ${tableCount}`,
    `- Drawings: ${drawingCount}`,
    `- Caption candidates: ${captionCount}`,
    "",
    "## Proposed L2 Fields",
    "- TableObject: objectId, startParagraphIndex, endParagraphIndex, rowCount, columnCount, hasTblHeaderInFirstRow, tblLookAttributes, firstRowText, headerRowTextHash.",
    "- FigureObject: objectId, anchorParagraphIndex, isInline, wrapMode, relationshipId.",
    "- CaptionNode: nodeId, paragraphIndex, text, styleName, matchedPattern, numberToken.",
    "- TableAdjacencyEvidence: prevTableId, currTableId, paragraphsBetween, captionsBetween.",
    "",
    "## Deferred Until PR #2",
    "- Do not define final ObjectGraph edge schema in PR #1.",
    "- Do not lock continuation voting thresholds until the owner approves Q4.",
    "- Do not replace existing flat parser outputs.",
  ].join("\n");
}

function collectSummaryMetrics(outputs: ProbeOutput[]) {
  const tblLookDistribution = new Map<string, number>();
  const captionStyleDistribution = new Map<string, number>();
  const wrapModeDistribution = new Map<string, number>();
  let tblHeaderCount = 0;
  let tableCount = 0;
  let continuationCaptionCount = 0;

  for (const output of outputs) {
    for (const table of output.tables) {
      tableCount += 1;
      if (table.hasTblHeaderInFirstRow) tblHeaderCount += 1;
      const attrs = Object.entries(table.tblLookAttributes);
      if (attrs.length === 0) {
        increment(tblLookDistribution, "none");
      } else {
        for (const [key, value] of attrs) increment(tblLookDistribution, `${key}=${value}`);
      }
    }
    for (const caption of output.captionCandidates) {
      increment(captionStyleDistribution, caption.styleName || "none");
      if (caption.matchedPattern === "continuation") continuationCaptionCount += 1;
    }
    for (const drawing of output.drawings) {
      increment(wrapModeDistribution, drawing.wrapMode || "unknown");
    }
  }

  return {
    tblHeaderCount,
    tableCount,
    tblLookDistribution,
    captionStyleDistribution,
    continuationCaptionCount,
    wrapModeDistribution,
  };
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function formatDistribution(map: Map<string, number>): string {
  if (map.size === 0) return "none";
  return [...map.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, count]) => `${key}:${count}`)
    .join(", ");
}

async function writeProbeArtifacts(docxPaths: string[], outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const outputs = await Promise.all(docxPaths.map(probeDocxObjects));
  for (const output of outputs) {
    await writeFile(path.join(outDir, `${path.basename(output.docxPath)}.json`), `${JSON.stringify(output)}\n`, "utf8");
  }
  await writeFile(path.join(outDir, "probe-summary-report.md"), `${buildSummaryReport(outputs)}\n`, "utf8");
  await writeFile(path.join(outDir, "pr2-ir-schema-proposal.md"), `${buildIrProposal(outputs)}\n`, "utf8");
}

function parseArgs(argv: string[]): { docxPaths: string[]; outDir: string } {
  const outIndex = argv.indexOf("--out");
  const outDir = outIndex >= 0 ? argv[outIndex + 1] : path.resolve(process.cwd(), "scripts/probe-output");
  const docxPaths = argv.filter((arg, index) => {
    if (arg === "--out") return false;
    if (outIndex >= 0 && index === outIndex + 1) return false;
    return true;
  });
  if (docxPaths.length === 0) {
    throw new Error("Usage: tsx scripts/probe-docx-objects.ts <docx...> [--out scripts/probe-output]");
  }
  return { docxPaths, outDir };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const { docxPaths, outDir } = parseArgs(process.argv.slice(2));
  writeProbeArtifacts(docxPaths, outDir).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
