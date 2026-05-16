/**
 * L2 Object Graph builder — stub for PR #2 object-graph integration.
 * Converts DocxObjectExtraction into an ObjectGraph for downstream detectors.
 */
import type { DocxObjectExtraction } from "../docx-object-extractor.js";
import type { ObjectGraph, ObjectGraphSource } from "./types.js";

const SCHEMA_VERSION = "object-graph.v0.1";

export function buildObjectGraphFromExtraction(
  extraction: DocxObjectExtraction,
  meta: { documentId?: string; documentVersion?: string },
): ObjectGraph {
  const source: ObjectGraphSource = {
    parser: "docx-xml",
    docxPath: extraction.docxPath,
    generatedAt: new Date().toISOString(),
    probeEvidence: {
      tableCount: extraction.stats.tableCount,
      drawingCount: extraction.stats.drawingCount,
      captionCandidateCount: extraction.stats.captionCandidateCount,
    },
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    documentId: meta.documentId,
    documentVersion: meta.documentVersion,
    source,
    nodes: [],
    edges: [],
    paragraphIndex: [],
    warnings: [],
  };
}
