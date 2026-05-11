// Phase 1 invariant checks are executable architecture assertions.
// They verify that page and rulePath remain derived from focusFindingId/ruleId.
// This script is intentionally independent from UI and backend code.
// It can run through tsx when available or Node's TypeScript stripping fallback.
import assert from 'node:assert/strict';
import { createFindingState } from '../src/core/finding/store.ts';
import { selectCurrentPage, selectFocusedRulePath } from '../src/core/finding/selectors.ts';
import { createRuleRegistry } from '../src/core/rule/rule-resolver.ts';
import type { Finding } from '../src/core/finding/schema.ts';

const registry = createRuleRegistry([
  {
    ruleId: 'RULE-A',
    rulePath: {
      packageName: 'School Rules',
      section: 'Section A',
      clause: 'RULE-A',
      label: 'Rule A',
    },
  },
]);

const finding: Finding = {
  findingId: 'finding-invariant',
  documentId: 'doc-invariant',
  documentVersion: 1,
  ruleId: 'RULE-A',
  rulePath: registry['RULE-A'].rulePath,
  severity: 'P0',
  confidence: 1,
  status: 'pending',
  anchor: { pageIndex: 6, paragraphIndex: 0 },
  span: { start: 0, end: 4, text: 'test' },
  evidence_snapshot: { text: 'test', source: 'parser' },
  rule_snapshot: { ruleText: 'Rule A text', ruleVersion: 'v1' },
  suggestion_snapshot: { type: 'manual_only', explanation: 'Fix manually' },
  createdAt: '2026-05-11T00:00:00.000Z',
  updatedAt: '2026-05-11T00:00:00.000Z',
};

const state = createFindingState([finding], finding.findingId);
assert.equal(selectCurrentPage(state), 6, 'currentPage must derive from focusFinding.anchor.pageIndex');
assert.equal(selectFocusedRulePath(state, registry)?.rulePath.clause, 'RULE-A', 'rulePath must resolve from focused finding ruleId');

console.log('Phase 1 invariants passed');

