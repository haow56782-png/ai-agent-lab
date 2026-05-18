/**
 * L2 Object Graph builder — stub for PR #2 object-graph integration.
 * Converts DocxObjectExtraction into an ObjectGraph for downstream detectors.
 */
import type { DocxObjectExtraction } from "../docx-object-extractor.js";
import type { ObjectGraph } from "./types.js";
export declare function buildObjectGraphFromExtraction(extraction: DocxObjectExtraction, meta: {
    documentId?: string;
    documentVersion?: string;
}): ObjectGraph;
