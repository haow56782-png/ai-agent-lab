import assert from 'node:assert/strict';
import { detectHeadings } from '../src/heading-detector.ts';

const headings = detectHeadings([
  { text: '目录........................1', styleName: 'TOC 1', paragraphIndex: 0 },
  { text: '第一章 绪论', styleName: 'Heading 1', paragraphIndex: 1, pageIndex: 3 },
  { text: '1.1 研究背景', styleName: 'Heading 2', paragraphIndex: 2, pageIndex: 3 },
]);

assert.equal(headings.length, 2);
assert.equal(headings[0].level, 1);
assert.equal(headings[1].level, 2);
assert.equal(headings[0].pageIndex, 3);

console.log('heading-detector.test.ts passed');

