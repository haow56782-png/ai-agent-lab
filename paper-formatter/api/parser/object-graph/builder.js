const SCHEMA_VERSION = "object-graph.v0.1";
export function buildObjectGraphFromExtraction(extraction, meta) {
    const source = {
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
