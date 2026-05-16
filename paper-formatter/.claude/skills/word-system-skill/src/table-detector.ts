import { detectContinuationTables, type RawTable } from './continuation-table-detector.ts';
import type { WordSystemWarning } from './rule-engine.ts';

export interface TableRecognition {
  tableId: string;
  tableIndex: number;
  pageIndex: number;
  columnCount: number;
  rowCount: number;
  headerRows: string[][];
  headerTextHash?: string;
  tblLook?: Record<string, unknown>;
  caption?: string;
  captionId?: string;
  tableNumber?: string;
  isContinuation: boolean;
  continuationOf?: string;
  confidence: number;
  evidence: Record<string, unknown>;
  warnings: WordSystemWarning[];
}

export function detectTables(tables: RawTable[]): TableRecognition[] {
  const continuationDecisions = detectContinuationTables(tables);
  return tables.map((table, index) => {
    const continuation = continuationDecisions[index];
    return {
      tableId: table.tableId || `table-${table.tableIndex}`,
      tableIndex: table.tableIndex,
      pageIndex: table.pageIndex ?? 0,
      columnCount: table.columnCount,
      rowCount: table.rowCount,
      headerRows: table.headerRows || [],
      headerTextHash: table.headerTextHash,
      tblLook: table.tblLook,
      caption: table.caption,
      captionId: table.captionId,
      tableNumber: table.tableNumber,
      isContinuation: continuation.isContinuation,
      continuationOf: continuation.continuationOf,
      confidence: continuation.isContinuation ? continuation.continuationConfidence / 100 : 0.97,
      evidence: {
        startParagraphIndex: table.startParagraphIndex,
        endParagraphIndex: table.endParagraphIndex,
        continuation,
      },
      warnings: continuation.warnings,
    };
  });
}

