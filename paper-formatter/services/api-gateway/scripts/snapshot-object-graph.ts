/**
 * PR #5 ObjectGraph snapshot generator.
 * Produces portable JSON fixtures from real DOCX files by running the formal
 * L1 extractor and PR #4 builder. It does not wire ObjectGraph into jobs.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractDocxObjectsFromDocxPath } from "../src/parser/docx-object-extractor.js";
import { buildObjectGraphFromExtraction } from "../src/parser/object-graph/builder.js";
import type { ObjectGraph } from "../src/parser/object-graph/types.js";

export const DEFAULT_OBJECT_GRAPH_SNAPSHOT_TIME = "2026-05-13T00:00:00.000Z";

export interface SnapshotObjectGraphOptions {
  generatedAt?: string;
  documentVersion?: string;
}

export interface WriteObjectGraphSnapshotsOptions extends SnapshotObjectGraphOptions {
  outDir: string;
}

export async function snapshotObjectGraphFromDocxPath(
  docxPath: string,
  options: SnapshotObjectGraphOptions = {},
): Promise<ObjectGraph> {
  const extraction = await extractDocxObjectsFromDocxPath(docxPath);
  const sourceBasename = path.basename(docxPath);
  return buildObjectGraphFromExtraction(
    { ...extraction, docxPath: sourceBasename },
    {
      documentId: documentIdFromBasename(sourceBasename),
      documentVersion: options.documentVersion ?? "snapshot-v0.1",
      generatedAt: options.generatedAt ?? DEFAULT_OBJECT_GRAPH_SNAPSHOT_TIME,
    },
  );
}

export async function writeObjectGraphSnapshots(
  docxPaths: string[],
  options: WriteObjectGraphSnapshotsOptions,
): Promise<string[]> {
  await mkdir(options.outDir, { recursive: true });
  const written: string[] = [];
  for (const docxPath of docxPaths) {
    const graph = await snapshotObjectGraphFromDocxPath(docxPath, options);
    const filePath = path.join(options.outDir, `${path.basename(docxPath)}.object-graph.json`);
    await writeFile(filePath, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
    written.push(filePath);
  }
  return written;
}

function documentIdFromBasename(basename: string): string {
  return basename
    .replace(/\.docx$/i, "")
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "object_graph_snapshot";
}

function parseArgs(argv: string[]): { docxPaths: string[]; options: WriteObjectGraphSnapshotsOptions } {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const documentVersionIndex = argv.indexOf("--document-version");
  const outDir = outIndex >= 0
    ? argv[outIndex + 1]
    : path.resolve(process.cwd(), "tests/fixtures/object-graph");
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] : DEFAULT_OBJECT_GRAPH_SNAPSHOT_TIME;
  const documentVersion = documentVersionIndex >= 0 ? argv[documentVersionIndex + 1] : "snapshot-v0.1";
  const consumedIndexes = new Set<number>();
  addOptionIndexes(consumedIndexes, outIndex);
  addOptionIndexes(consumedIndexes, generatedAtIndex);
  addOptionIndexes(consumedIndexes, documentVersionIndex);
  const docxPaths = argv.filter((arg, index) => !arg.startsWith("--") && !consumedIndexes.has(index));
  if (docxPaths.length === 0) {
    throw new Error("Usage: tsx scripts/snapshot-object-graph.ts <docx...> [--out tests/fixtures/object-graph]");
  }
  return { docxPaths, options: { outDir, generatedAt, documentVersion } };
}

function addOptionIndexes(consumedIndexes: Set<number>, optionIndex: number): void {
  if (optionIndex < 0) return;
  consumedIndexes.add(optionIndex);
  consumedIndexes.add(optionIndex + 1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const { docxPaths, options } = parseArgs(process.argv.slice(2));
  writeObjectGraphSnapshots(docxPaths, options)
    .then((files) => {
      for (const file of files) console.log(file);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
