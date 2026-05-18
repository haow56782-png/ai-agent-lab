import * as storage from "../../storage.js";
function resolveFixedDocumentSuffix(isPdfPassthrough) {
    return isPdfPassthrough ? "_fixed.pdf" : "_fixed.docx";
}
function resolveFixedDocumentContentType(isPdfPassthrough) {
    return isPdfPassthrough
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}
export async function writeFixOutputs(writeRequest) {
    const isPassthrough = writeRequest.fixedDocumentBuffer === writeRequest.originalDocumentBuffer;
    const isPdfPassthrough = isPassthrough && /\.pdf$/i.test(writeRequest.documentRecord.filename);
    const outputSuffix = resolveFixedDocumentSuffix(isPdfPassthrough);
    const outputContentType = resolveFixedDocumentContentType(isPdfPassthrough);
    const outputFilename = writeRequest.documentRecord.filename.replace(/\.(docx|pdf)$/i, outputSuffix);
    const outputKey = storage.getStoragePath("outputs", writeRequest.documentRecord.doc_id, outputFilename);
    await storage.uploadFile("outputs", outputKey, writeRequest.fixedDocumentBuffer, outputContentType);
    const diffKey = `${writeRequest.documentRecord.doc_id}/fix-${writeRequest.jobId}-diff.json`;
    await storage.uploadFile("reports", diffKey, Buffer.from(JSON.stringify(writeRequest.diffJson, null, 2)), "application/json");
    return { outputKey, diffKey, isPassthrough };
}
