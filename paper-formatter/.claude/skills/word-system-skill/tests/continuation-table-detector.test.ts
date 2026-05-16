import assert from 'node:assert/strict';
import { detectContinuationTables, scoreContinuationPair } from '../src/continuation-table-detector.ts';

const prev = {
  tableId: 't1',
  tableIndex: 1,
  columnCount: 4,
  rowCount: 5,
  headerTextHash: 'same',
  tblHeader: true,
  tblLook: { firstRow: true },
  caption: '表 2-1 指标表',
  tableNumber: '2-1',
  startParagraphIndex: 10,
  endParagraphIndex: 15,
};

const curr = {
  tableId: 't2',
  tableIndex: 2,
  columnCount: 4,
  rowCount: 5,
  headerTextHash: 'same',
  tblHeader: true,
  tblLook: { firstRow: true },
  caption: '续表 2-1',
  tableNumber: '2-1',
  startParagraphIndex: 16,
  endParagraphIndex: 20,
  paragraphsBetween: [''],
};

const score = scoreContinuationPair(prev, curr);
assert.equal(score.structureScore, 100);
assert.equal(score.textScore, 100);
assert.equal(score.continuationConfidence, 100);

const decisions = detectContinuationTables([prev, { ...curr, caption: '表 2-2 新表', tableNumber: '2-2' }]);
assert.equal(decisions[1].conflictType, 'structure_strong_text_new_caption');
assert.equal(decisions[1].warnings.length, 1);

console.log('continuation-table-detector.test.ts passed');

