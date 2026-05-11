// Phase 1 contract tests run without a browser or backend.
// They verify Finding schema, adapter, store, selectors, status machine, and rule resolver.
// These tests intentionally assert invariants, not UI screenshots.
import assert from 'node:assert/strict';
import { normalizeLegacyAnnotationToFinding, normalizeLegacyIssueToFinding, normalizeRepairActionToFinding } from '../../src/core/finding/adapter.ts';
import { assertFinding, type Finding } from '../../src/core/finding/schema.ts';
import { selectCurrentPage, selectFocusedFinding, selectFocusedRulePath, selectHighlightSpan, selectPendingFindings } from '../../src/core/finding/selectors.ts';
import { createFindingState, applyFindingStatusAction, setFocusFinding, upsertFindings } from '../../src/core/finding/store.ts';
import { canTransitionFindingStatus, getNextFindingStatus } from '../../src/core/finding/status-machine.ts';
import { createRuleRegistry } from '../../src/core/rule/rule-resolver.ts';

const now = '2026-05-11T00:00:00.000Z';
const registry = createRuleRegistry([
  {
    ruleId: 'USTC-C1',
    rulePath: {
      packageName: '中国科学技术大学 vAuto',
      section: '目录与页码',
      clause: 'USTC-C1',
      label: '目录页码一致性',
    },
  },
  {
    ruleId: 'GB7713-5.2',
    rulePath: {
      packageName: 'GB/T 7713.1-2025',
      section: '§5.2',
      clause: 'GB7713-5.2',
      label: '题名层级',
    },
  },
]);

const baseFinding: Finding = {
  findingId: 'finding-a',
  documentId: 'doc-1',
  documentVersion: 1,
  ruleId: 'USTC-C1',
  rulePath: registry['USTC-C1'].rulePath,
  severity: 'P1',
  confidence: 0.88,
  status: 'pending',
  anchor: { pageIndex: 2, paragraphIndex: 1, charOffset: 10 },
  span: { start: 10, end: 18, text: '目录页码' },
  evidence_snapshot: { text: '目录页码', source: 'parser' },
  rule_snapshot: { ruleText: '目录点线与页码右对齐', ruleVersion: 'vAuto' },
  suggestion_snapshot: { type: 'format-hint', before: '目录页码', after: '目录页码右对齐' },
  createdAt: now,
  updatedAt: now,
};

function testSchema() {
  assert.equal(assertFinding(baseFinding).findingId, 'finding-a');
  assert.throws(
    () => assertFinding({ ...baseFinding, evidence_snapshot: { text: '' } }),
    /evidence_snapshot.text is required/,
  );
}

function testAdapter() {
  const issue = normalizeLegacyIssueToFinding({
    id: 'legacy-issue-1',
    text: '第一章标题层级混乱',
    ruleId: 'GB7713-5.2',
    severity: 'warn',
    page: 3,
    suggestion: '按题名层级重新编号',
  }, { documentId: 'doc-1', documentVersion: 1, ruleRegistry: registry, now });
  assert.equal(issue.ok, true);
  if (issue.ok) {
    assert.equal(issue.finding.findingId, 'legacy-issue-1');
    assert.equal(issue.finding.anchor.pageIndex, 2);
    assert.equal(issue.finding.rulePath.clause, 'GB7713-5.2');
  }

  const annotation = normalizeLegacyAnnotationToFinding({
    text: '页边批注',
    rule: 'USTC-C1',
    pageIndex: 4,
  }, { documentId: 'doc-1', documentVersion: 1, ruleRegistry: registry, now });
  assert.equal(annotation.ok, true);

  const repairAction = normalizeRepairActionToFinding({
    type: 'replace',
    payload: '把“章”替换为阿拉伯数字编号',
    rule: 'GB7713-5.2',
    page: 5,
  }, { documentId: 'doc-1', documentVersion: 1, ruleRegistry: registry, now });
  assert.equal(repairAction.ok, true);

  const missing = normalizeLegacyIssueToFinding({ text: 'no rule' }, { documentId: 'doc-1', documentVersion: 1, ruleRegistry: registry, now });
  assert.equal(missing.ok, false);
}

function testStoreAndSelectors() {
  const samePageFinding: Finding = {
    ...baseFinding,
    findingId: 'finding-b',
    ruleId: 'GB7713-5.2',
    rulePath: registry['GB7713-5.2'].rulePath,
    span: { start: 20, end: 25, text: '标题' },
    anchor: { pageIndex: 2, paragraphIndex: 2, charOffset: 20 },
  };
  const state = createFindingState([samePageFinding, baseFinding], 'finding-b');
  assert.deepEqual(state.allIds, ['finding-a', 'finding-b']);
  assert.equal(selectFocusedFinding(state)?.findingId, 'finding-b');
  assert.equal(selectCurrentPage(state), 2);
  assert.equal(selectFocusedRulePath(state, registry)?.rulePath.label, '题名层级');
  assert.equal(selectHighlightSpan(state)?.text, '标题');
  assert.equal(selectPendingFindings(state).length, 2);

  const focused = setFocusFinding(state, 'finding-a');
  assert.equal(selectFocusedFinding(focused)?.findingId, 'finding-a');
  assert.equal(setFocusFinding(state, 'missing'), state);

  const accepted = applyFindingStatusAction(focused, 'finding-a', 'accept', now);
  assert.equal(accepted.byId['finding-a'].status, 'accepted');
  assert.equal(accepted.byId['finding-b'].status, 'pending');

  const upserted = upsertFindings(accepted, [{ ...baseFinding, findingId: 'finding-c', anchor: { pageIndex: 0 } }], 'finding-c');
  assert.equal(upserted.allIds[0], 'finding-c');
  assert.equal(upserted.focusFindingId, 'finding-c');
}

function testStatusMachine() {
  assert.equal(getNextFindingStatus('pending', 'accept').status, 'accepted');
  assert.equal(canTransitionFindingStatus('accepted', 'ignore'), false);
  assert.equal(getNextFindingStatus('rejudging', 'resolve').status, 'resolved');
}

testSchema();
testAdapter();
testStoreAndSelectors();
testStatusMachine();
console.log('Phase 1 finding contract tests passed');
