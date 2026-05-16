/**
 * PR #3 DOCX object extractor tests.
 * These tests verify the formal source extractor, not the PR #1 probe wrapper,
 * and keep it isolated from analyze-job or ObjectGraph builder behavior.
 */
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";

import {
  extractDocxObjectsFromDocxBuffer,
  extractDocxObjectsFromDocxPath,
  extractDocxObjectsFromDocumentXml,
} from "../src/parser/docx-object-extractor.js";

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("docx-object-extractor", () => {
  it("extracts paragraphs, drawings, captions, tables, and adjacent table pairs", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "docx-object-extractor-"));
    const docxPath = path.join(tempDir, "objects.docx");
    await writeFile(docxPath, await buildDocxBuffer(buildDocumentXml()));

    const output = await extractDocxObjectsFromDocxPath(docxPath);

    expect(output.warnings).toEqual([]);
    expect(output.stats).toEqual({
      paragraphCount: 5,
      tableCount: 2,
      drawingCount: 1,
      captionCandidateCount: 3,
    });
    expect(output.drawings[0]).toMatchObject({
      objectId: "figure:0:0",
      anchorParagraphIndex: 0,
      wrapMode: "inline",
      relationshipId: "rId5",
      isInline: true,
    });
    expect(output.captionCandidates.map((caption) => caption.matchedPattern)).toEqual([
      "figure",
      "table",
      "continuation",
    ]);
    expect(output.tables[0]).toMatchObject({
      objectId: "table:0",
      rowCount: 1,
      columnCount: 2,
      headerRowCount: 1,
      hasTblHeaderInFirstRow: true,
      firstRowText: ["列 A", "列 B"],
      schemaFingerprint: expect.stringMatching(/^2:/),
    });
    expect(output.adjacentTablePairs[0]).toMatchObject({
      prevTableObjectId: "table:0",
      currTableObjectId: "table:1",
      captionsBetween: [
        expect.objectContaining({ matchedPattern: "table" }),
        expect.objectContaining({ matchedPattern: "continuation" }),
      ],
    });
  });

  it("returns a warning instead of throwing when document.xml is missing", async () => {
    const zip = new JSZip();
    zip.file("word/empty.xml", "<empty/>");

    const output = await extractDocxObjectsFromDocxBuffer(await zip.generateAsync({ type: "nodebuffer" }));

    expect(output.stats.tableCount).toBe(0);
    expect(output.warnings).toEqual([
      {
        code: "missing_document_xml",
        message: "DOCX package does not contain word/document.xml",
      },
    ]);
  });

  it("returns a warning when document body is absent", () => {
    const output = extractDocxObjectsFromDocumentXml("<w:document xmlns:w=\"x\" />");

    expect(output.stats.paragraphCount).toBe(0);
    expect(output.warnings[0]).toMatchObject({ code: "missing_document_body" });
  });
});

async function buildDocxBuffer(documentXml: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "nodebuffer" });
}

function buildDocumentXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:r><w:drawing><wp:inline><a:graphic><a:graphicData><a:blip r:embed="rId5"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>
    </w:p>
    <w:p><w:pPr><w:pStyle w:val="Caption"/></w:pPr><w:r><w:t>图 1-1 探针流程图</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblLook w:firstRow="1" w:lastRow="0"/></w:tblPr>
      <w:tr>
        <w:trPr><w:tblHeader w:val="1"/></w:trPr>
        <w:tc><w:p><w:r><w:t>列 A</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>列 B</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:pPr><w:pStyle w:val="Caption"/></w:pPr><w:r><w:t>表 1-1 探针数据表</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Caption"/></w:pPr><w:r><w:t>续表 1-1</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblLook w:firstRow="1" w:lastRow="0"/></w:tblPr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>列 A</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>列 B</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>正文段落</w:t></w:r></w:p>
  </w:body>
</w:document>`;
}
