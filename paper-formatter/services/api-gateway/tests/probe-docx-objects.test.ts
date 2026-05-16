/**
 * Smoke tests for the PR #1 DOCX object probe.
 * The production evidence comes from real owner-provided DOCX files; this test
 * only protects the XML traversal contract from accidental breakage.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import JSZip from 'jszip';
import { afterEach, describe, expect, it } from 'vitest';

import { probeDocxObjects } from '../scripts/probe-docx-objects';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('probe-docx-objects', () => {
  it('extracts paragraphs, tables, drawings, captions, and adjacent table gaps from document XML', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'docx-probe-'));
    const docxPath = path.join(tempDir, 'probe.docx');
    const zip = new JSZip();
    zip.file('word/document.xml', buildDocumentXml());
    await writeFile(docxPath, await zip.generateAsync({ type: 'nodebuffer' }));

    const output = await probeDocxObjects(docxPath);

    expect(output.stats).toEqual({
      paragraphCount: 5,
      tableCount: 2,
      drawingCount: 1,
      captionCandidateCount: 3,
    });
    expect(output.drawings[0]).toMatchObject({
      anchorParagraphIndex: 0,
      wrapMode: 'inline',
      relationshipId: 'rId5',
      isInline: true,
    });
    expect(output.captionCandidates.map(candidate => candidate.matchedPattern)).toEqual([
      'figure',
      'table',
      'continuation',
    ]);
    expect(output.tables[0]).toMatchObject({
      rowCount: 1,
      columnCount: 2,
      hasTblHeaderInFirstRow: true,
      firstRowText: ['列 A', '列 B'],
    });
    expect(output.adjacentTablePairs[0].captionsBetween).toHaveLength(2);
  });
});

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
