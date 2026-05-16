import assert from 'node:assert/strict';
import { detectTables } from '../src/table-detector.ts';

const tables = detectTables([
  {
    tableId: 'table-1',
    tableIndex: 1,
    columnCount: 3,
    rowCount: 4,
    headerTextHash: 'abc',
    tblHeader: true,
    tblLook: { firstRow: true },
    caption: '表 3-1 实验数据',
    tableNumber: '3-1',
    startParagraphIndex: 10,
    endParagraphIndex: 14,
  },
  {
    tableId: 'table-2',
    tableIndex: 2,
    columnCount: 3,
    rowCount: 4,
    headerTextHash: 'abc',
    tblHeader: true,
    tblLook: { firstRow: true },
    caption: '续表 3-1',
    tableNumber: '3-1',
    startParagraphIndex: 15,
    endParagraphIndex: 19,
    paragraphsBetween: [''],
  },
]);

assert.equal(tables.length, 2);
assert.equal(tables[1].isContinuation, true);
assert.equal(tables[1].continuationOf, 'table-1');

console.log('table-detector.test.ts passed');

