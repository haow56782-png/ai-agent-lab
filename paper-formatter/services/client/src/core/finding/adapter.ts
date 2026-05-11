// Legacy finding adapters are the only Phase 1 bridge from old objects to Finding.
// They do not read UI state, currentPage, React stores, or backend clients.
// Unknown legacy shapes return structured errors instead of silently inventing facts.
// All generated ids are stable for the same documentId and legacy id/text/rule tuple.
import { resolveRulePath, type RuleRegistry } from '../rule/rule-resolver.ts';
import type {
  Finding,
  FindingAnchor,
  FindingSeverity,
  FindingSpan,
  FindingStatus,
  FindingSuggestionSnapshot,
} from './schema.ts';
import { assertFinding, isFindingSeverity, isFindingStatus } from './schema.ts';

export interface LegacyAdapterContext {
  documentId: string;
  documentVersion: number;
  ruleRegistry: RuleRegistry;
  now?: string;
}

export interface LegacyAdapterSuccess {
  ok: true;
  finding: Finding;
  warnings: string[];
}

export interface LegacyAdapterFailure {
  ok: false;
  error: string;
  warnings: string[];
}

export type LegacyAdapterResult = LegacyAdapterSuccess | LegacyAdapterFailure;
export type LegacyObject = Record<string, unknown>;

function isObject(value: unknown): value is LegacyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: LegacyObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(source: LegacyObject, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function normalizeSeverity(value: unknown): FindingSeverity {
  if (isFindingSeverity(value)) return value;
  if (value === 'fail' || value === 'error' || value === 'high') return 'P0';
  if (value === 'warn' || value === 'medium') return 'P1';
  return 'P2';
}

function normalizeStatus(value: unknown): FindingStatus {
  if (isFindingStatus(value)) return value;
  if (value === 'rejected') return 'ignored';
  if (value === 'closed') return 'resolved';
  return 'pending';
}

function stableId(seed: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `finding-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function toZeroBasedPageIndex(pageValue: number | undefined, pageIndexValue: number | undefined): number | undefined {
  if (typeof pageIndexValue === 'number') return Math.max(0, Math.floor(pageIndexValue));
  if (typeof pageValue === 'number') return Math.max(0, Math.floor(pageValue) - 1);
  return undefined;
}

function buildFinding(input: {
  legacy: LegacyObject;
  context: LegacyAdapterContext;
  defaultSource: 'parser' | 'ocr' | 'manual' | 'repair-action' | 'unknown';
  suggestionType: FindingSuggestionSnapshot['type'];
}): LegacyAdapterResult {
  const legacy = input.legacy;
  const context = input.context;
  const warnings: string[] = [];
  const text = readString(legacy, ['text', 'current', 'before', 'message', 'problem', 'payload', 'content']);
  const ruleId = readString(legacy, ['ruleId', 'rule_id', 'rule']) || readString(legacy, ['cat', 'category']);
  if (!text) return { ok: false, error: 'Legacy object does not contain text/message evidence', warnings };
  if (!ruleId) return { ok: false, error: 'Legacy object does not contain rule/ruleId', warnings };

  const rawId = readString(legacy, ['findingId', 'finding_id', 'id']);
  const pageIndex = toZeroBasedPageIndex(readNumber(legacy, ['page']), readNumber(legacy, ['pageIndex']));
  const start = readNumber(legacy, ['start', 'char_start', 'charOffset']) ?? 0;
  const end = readNumber(legacy, ['end', 'char_end']) ?? Math.max(start + text.length, start + 1);
  const confidence = readNumber(legacy, ['confidence']);
  const after = readString(legacy, ['after', 'target', 'suggestion', 'payload']);
  const message = readString(legacy, ['message', 'label', 'note', 'problem']) || text;
  const ruleResult = resolveRulePath(ruleId, context.ruleRegistry, {
    packageName: readString(legacy, ['rulePackage', 'cat']) || 'Legacy Rule Package',
    section: readString(legacy, ['section', 'category']) || 'Legacy Section',
    clause: ruleId,
    label: readString(legacy, ['label', 'ruleLabel']) || ruleId,
  });
  if (ruleResult.warning) warnings.push(ruleResult.warning);

  const anchor: FindingAnchor = {
    pageIndex,
    paragraphIndex: readNumber(legacy, ['paragraphIndex', 'paragraph']),
    charOffset: readNumber(legacy, ['charOffset']),
  };
  const span: FindingSpan = { start, end, text };
  const now = context.now ?? new Date().toISOString();
  const finding: Finding = {
    findingId: rawId || stableId(`${context.documentId}:${ruleId}:${text}:${pageIndex ?? 'global'}`),
    documentId: context.documentId,
    documentVersion: context.documentVersion,
    ruleId,
    rulePath: ruleResult.rulePath,
    severity: normalizeSeverity(legacy.severity ?? legacy.status),
    confidence,
    status: normalizeStatus(legacy.status),
    anchor,
    span,
    evidence_snapshot: {
      text,
      contextBefore: readString(legacy, ['contextBefore', 'context_before']),
      contextAfter: readString(legacy, ['contextAfter', 'context_after']),
      source: input.defaultSource,
    },
    rule_snapshot: {
      ruleText: readString(legacy, ['ruleText', 'rule_text', 'label']) || message,
      ruleVersion: readString(legacy, ['ruleVersion', 'rule_version']) || 'legacy',
      ruleDescription: readString(legacy, ['ruleDescription', 'rule_description', 'target']),
    },
    suggestion_snapshot: {
      type: input.suggestionType,
      before: text,
      after,
      explanation: after || message,
    },
    createdAt: readString(legacy, ['createdAt', 'created_at']) || now,
    updatedAt: readString(legacy, ['updatedAt', 'updated_at']) || now,
  };

  try {
    return { ok: true, finding: assertFinding(finding), warnings };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Finding validation failed',
      warnings,
    };
  }
}

export function normalizeLegacyIssueToFinding(issue: unknown, context: LegacyAdapterContext): LegacyAdapterResult {
  if (!isObject(issue)) return { ok: false, error: 'Legacy issue must be an object', warnings: [] };
  return buildFinding({ legacy: issue, context, defaultSource: 'parser', suggestionType: 'manual_only' });
}

export function normalizeLegacyAnnotationToFinding(annotation: unknown, context: LegacyAdapterContext): LegacyAdapterResult {
  if (!isObject(annotation)) return { ok: false, error: 'Legacy annotation must be an object', warnings: [] };
  return buildFinding({ legacy: annotation, context, defaultSource: 'manual', suggestionType: 'annotate' });
}

export function normalizeRepairActionToFinding(repairAction: unknown, context: LegacyAdapterContext): LegacyAdapterResult {
  if (!isObject(repairAction)) return { ok: false, error: 'Legacy repairAction must be an object', warnings: [] };
  const type = readString(repairAction, ['type']);
  const suggestionType: FindingSuggestionSnapshot['type'] = type === 'insert' || type === 'delete' || type === 'replace' || type === 'annotate'
    ? type
    : 'format-hint';
  return buildFinding({ legacy: repairAction, context, defaultSource: 'repair-action', suggestionType });
}
