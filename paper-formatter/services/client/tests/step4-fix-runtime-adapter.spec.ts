import { test, expect } from '@playwright/test';
import type { FindingContract, FixStatusResponse } from '../src/api/client';
import { createMockPaperContent } from '../src/mock/paperContent';
import { attachFindingsToFixStatus, createFixActionsFromFindings } from '../src/screens/step4-fix/findingFixActionAdapter';

const now = '2026-05-12T00:00:00.000Z';

const referenceFinding: FindingContract = {
  finding_id: '11111111-1111-4111-8111-111111111111',
  document_id: 'doc-canonical',
  document_version: 1,
  rule_id: 'RULE-L2-REFERENCE_DOI',
  rule_group: '参考文献',
  rule_snapshot: {
    rule_text: '缺 DOI',
    rule_version: 'vAuto',
    rule_description: '参考文献著录',
  },
  severity: 'P1',
  confidence: 0.82,
  evidence_spans: [{ page: 1, char_start: 0, char_end: 16, snippet: '参考文献缺少 DOI 信息' }],
  evidence_snapshot: '参考文献缺少 DOI 信息',
  suggestion: {
    type: 'replace',
    fix_diff: {
      before: '参考文献缺少 DOI 信息',
      after: '补齐 DOI 并按国标著录',
      spans_affected: [{ page: 1, char_start: 0, char_end: 16, snippet: '参考文献缺少 DOI 信息' }],
    },
    explanation: '补齐 DOI 并按国标著录',
  },
  status: 'pending',
  created_at: now,
  updated_at: now,
  audit_trail: [],
};

test.describe('Step4Fix finding/action adapter', () => {
  test('links fix status events and artifacts back to finding_id', () => {
    const status: FixStatusResponse = {
      status: 'running',
      completedSteps: [],
      currentStep: 'reference_format',
      progress: 40,
      events: [{
        id: 'evt-reference',
        at: now,
        type: 'artifact',
        stage: 'fixed:reference_format',
        title: '参考文献格式已整理',
        detail: '正在处理参考文献',
        fixType: 'reference_format',
      }],
      artifacts: [{
        id: 'art-reference',
        fixType: 'reference_format',
        title: '参考文献格式已整理',
        summary: '已写回到修复稿件',
        details: ['参考文献著录'],
        status: 'needs_review',
        chapter: '参考文献',
        sourceSnippet: '参考文献缺少 DOI 信息',
      }],
    };

    const linkedStatus = attachFindingsToFixStatus(status, [referenceFinding]);
    expect(linkedStatus.events?.[0]?.finding_id).toBe(referenceFinding.finding_id);
    expect(linkedStatus.artifacts?.[0]?.related_finding_ids).toEqual([referenceFinding.finding_id]);
  });

  test('derives playback actions from canonical findings', () => {
    const paperContent = createMockPaperContent({
      title: '论文',
      header: '本科毕业论文',
      totalPages: 1,
      headings: ['参考文献'],
      paragraphs: ['参考文献缺少 DOI 信息，需要按国标著录规则补齐。'],
    });

    const actions = createFixActionsFromFindings({
      findings: [referenceFinding],
      paperContent,
      schoolRuleName: '学校规则 vAuto',
      baselineRuleName: 'GB/T 7713.1-2025',
    });

    expect(actions).toHaveLength(18);
    expect(actions[0].findingId).toBe(referenceFinding.finding_id);
    expect(actions[0].id).toBe(`fix-action-1-${referenceFinding.finding_id}`);
  });

});
