import assert from 'node:assert/strict';
import { detectWordStructure } from '../src/structure-detector.ts';

const structure = detectWordStructure({
  metadata: { sampleName: 'p0-basic-thesis' },
  paragraphs: [
    { text: '第一章 绪论', styleName: 'Heading 1', paragraphIndex: 0, pageIndex: 1 },
    { text: '正文段落\t含 Tab', styleName: '正文', paragraphIndex: 1, pageIndex: 1 },
    { text: '图 1-1 系统架构', styleName: '图题', paragraphIndex: 3, pageIndex: 1 },
    { text: '参考文献', styleName: 'Heading 1', paragraphIndex: 4, pageIndex: 8 },
    { text: '[1] Wang H. Thesis System DOI:10.1/test', paragraphIndex: 5, pageIndex: 8 },
  ],
  figures: [{ imageType: 'inline', anchorParagraph: 2, pageIndex: 1 }],
  headersFooters: [{ sectionId: 's1', pageIndex: 1, headerText: '论文题目', pageNumber: '1' }],
});

assert.equal(structure.headings.length, 2);
assert.equal(structure.paragraphs[1].issues.includes('tab_indent'), true);
assert.equal(structure.figures[0].caption, '图 1-1 系统架构');
assert.equal(structure.references.length, 1);
assert.equal(structure.headersFooters[0].headerRuleMatched, true);

console.log('structure-detector.test.ts passed');

