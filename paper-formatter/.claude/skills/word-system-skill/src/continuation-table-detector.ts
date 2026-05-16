import type { WordSystemWarning } from './rule-engine.ts';

export interface RawTable {
  tableId?: string;
  tableIndex: number;
  pageIndex?: number;
  columnCount: number;
  rowCount: number;
  headerRows?: string[][];
  headerTextHash?: string;
  tblHeader?: boolean;
  tblLook?: Record<string, unknown>;
  caption?: string;
  captionId?: string;
  tableNumber?: string;
  startParagraphIndex: number;
  endParagraphIndex: number;
  paragraphsBetween?: string[];
}

export interface ContinuationTableDecision {
  tableId: string;
  isContinuation: boolean;
  continuationOf?: string;
  structureScore: number;
  textScore: number;
  continuationConfidence: number;
  decision: 'auto_continuation' | 'suspected_warning' | 'low_confidence_warning' | 'normal_table';
  conflictType?: 'structure_strong_text_new_caption' | 'structure_weak_text_continuation' | 'no_structure_text_continuation';
  warnings: WordSystemWarning[];
  evidence: Record<string, unknown>;
}

function hasSameColumnCount(prev: RawTable, curr: RawTable): boolean {
  return prev.columnCount > 0 && prev.columnCount === curr.columnCount;
}

function hasSameHeaderTextHash(prev: RawTable, curr: RawTable): boolean {
  return Boolean(prev.headerTextHash && curr.headerTextHash && prev.headerTextHash === curr.headerTextHash);
}

function hasSimilarTblLook(prev: RawTable, curr: RawTable): boolean {
  const prevLook = JSON.stringify(prev.tblLook || {});
  const currLook = JSON.stringify(curr.tblLook || {});
  return prevLook !== '{}' && prevLook === currLook;
}

function hasNoNonEmptyBodyBetween(curr: RawTable): boolean {
  return (curr.paragraphsBetween || []).every(text => !text.trim());
}

function isAdjacent(prev: RawTable, curr: RawTable): boolean {
  return curr.startParagraphIndex >= prev.endParagraphIndex && curr.startParagraphIndex - prev.endParagraphIndex <= 3;
}

function captionContainsContinuation(caption?: string): boolean {
  return /续表|continued/i.test(caption || '');
}

function captionInheritsPreviousNumber(prev: RawTable, curr: RawTable): boolean {
  return Boolean(prev.tableNumber && curr.tableNumber && prev.tableNumber === curr.tableNumber);
}

function hasNoIndependentNewCaption(prev: RawTable, curr: RawTable): boolean {
  if (!curr.caption) return true;
  if (captionContainsContinuation(curr.caption)) return true;
  return captionInheritsPreviousNumber(prev, curr);
}

export function scoreContinuationPair(prev: RawTable, curr: RawTable): Pick<ContinuationTableDecision, 'structureScore' | 'textScore' | 'continuationConfidence' | 'evidence'> {
  const structureSignals = {
    columnCountMatch: hasSameColumnCount(prev, curr),
    headerTextHashMatch: hasSameHeaderTextHash(prev, curr),
    tblHeaderExists: Boolean(curr.tblHeader),
    tblLookSimilar: hasSimilarTblLook(prev, curr),
    adjacentTables: isAdjacent(prev, curr),
    noNonEmptyBodyBetween: hasNoNonEmptyBodyBetween(curr),
  };
  const textSignals = {
    captionContainsContinuation: captionContainsContinuation(curr.caption),
    captionNumberInherited: captionInheritsPreviousNumber(prev, curr),
    noIndependentNewCaption: hasNoIndependentNewCaption(prev, curr),
  };

  const structureScore =
    (structureSignals.columnCountMatch ? 20 : 0) +
    (structureSignals.headerTextHashMatch ? 25 : 0) +
    (structureSignals.tblHeaderExists ? 15 : 0) +
    (structureSignals.tblLookSimilar ? 10 : 0) +
    (structureSignals.adjacentTables ? 15 : 0) +
    (structureSignals.noNonEmptyBodyBetween ? 15 : 0);

  const textScore =
    (textSignals.captionContainsContinuation ? 50 : 0) +
    (textSignals.captionNumberInherited ? 30 : 0) +
    (textSignals.noIndependentNewCaption ? 20 : 0);

  return {
    structureScore,
    textScore,
    continuationConfidence: structureScore * 0.7 + textScore * 0.3,
    evidence: { structureSignals, textSignals },
  };
}

function decideContinuation(confidence: number): ContinuationTableDecision['decision'] {
  if (confidence >= 85) return 'auto_continuation';
  if (confidence >= 70) return 'suspected_warning';
  if (confidence >= 50) return 'low_confidence_warning';
  return 'normal_table';
}

function resolveConflictType(prev: RawTable, curr: RawTable, structureScore: number, textScore: number): ContinuationTableDecision['conflictType'] | undefined {
  const structureStrong = structureScore >= 70;
  const structureWeak = structureScore > 0 && structureScore < 70;
  const hasNewCaption = Boolean(curr.caption && !captionContainsContinuation(curr.caption) && !captionInheritsPreviousNumber(prev, curr));
  if (structureStrong && hasNewCaption) return 'structure_strong_text_new_caption';
  if (structureWeak && textScore >= 50) return 'structure_weak_text_continuation';
  if (structureScore === 0 && textScore >= 50) return 'no_structure_text_continuation';
  return undefined;
}

function buildContinuationWarning(tableId: string, decision: ContinuationTableDecision['decision'], conflictType: ContinuationTableDecision['conflictType'], evidence: Record<string, unknown>): WordSystemWarning[] {
  if (decision === 'auto_continuation') return [];
  if (decision === 'normal_table' && !conflictType) return [];
  return [{
    warningId: `${tableId}-continuation-${decision}`,
    warningCode: conflictType ? 'CONTINUATION_CONFLICT' : 'CONTINUATION_AMBIGUOUS',
    severity: 'warning',
    message: '续表证据不足或结构与文本信号存在冲突。',
    source: 'continuation-table-detector',
    evidence: { ...evidence, conflictType, decision },
    recoveryAction: '保留表对象独立性，交由人工确认是否合并为续表。',
  }];
}

export function detectContinuationTables(tables: RawTable[]): ContinuationTableDecision[] {
  return tables.map((table, index) => {
    const tableId = table.tableId || `table-${table.tableIndex}`;
    if (index === 0) {
      return {
        tableId,
        isContinuation: false,
        structureScore: 0,
        textScore: 0,
        continuationConfidence: 0,
        decision: 'normal_table',
        warnings: [],
        evidence: { reason: 'first_table' },
      };
    }

    const prev = tables[index - 1];
    const prevId = prev.tableId || `table-${prev.tableIndex}`;
    const scoring = scoreContinuationPair(prev, table);
    const decision = decideContinuation(scoring.continuationConfidence);
    const conflictType = resolveConflictType(prev, table, scoring.structureScore, scoring.textScore);
    const isContinuation = decision === 'auto_continuation' || decision === 'suspected_warning';

    return {
      tableId,
      isContinuation,
      continuationOf: isContinuation ? prevId : undefined,
      structureScore: scoring.structureScore,
      textScore: scoring.textScore,
      continuationConfidence: scoring.continuationConfidence,
      decision,
      conflictType,
      warnings: buildContinuationWarning(tableId, decision, conflictType, scoring.evidence),
      evidence: scoring.evidence,
    };
  });
}

