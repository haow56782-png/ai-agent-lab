import { test, expect } from '@playwright/test';
import type { FindingContract, FixStatusResponse } from '../src/api/client';
import { createMockPaperContent } from '../src/mock/paperContent';
import { attachFindingsToFixStatus, createFixActionsFromFindings, resolveFixTypeForFinding } from '../src/screens/step4-fix/findingFixActionAdapter';

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

const overlapFinding: FindingContract = {
  finding_id: '22222222-2222-4222-8222-222222222222',
  document_id: 'doc-canonical',
  document_version: 1,
  rule_id: 'FLOATING_OBJECT_OVERLAP_TEXT',
  rule_group: '图形对象 & 正文',
  rule_snapshot: {
    rule_text: '图片/印章覆盖正文',
    rule_version: 'vAuto',
    rule_description: '系统发现页面中的图片、印章或浮动对象与正文文字发生重叠',
  },
  severity: 'P1',
  confidence: 0.94,
  evidence_spans: [{ page: 1, char_start: 0, char_end: 20, snippet: '红色印章压住了摘要正文' }],
  evidence_snapshot: '红色印章压住了摘要正文',
  suggestion: {
    type: 'restructure',
    fix_diff: {
      before: '红色印章',
      after: '调整图片环绕方式或图层顺序，确保对象不遮挡正文',
      spans_affected: [{ page: 1, char_start: 0, char_end: 20, snippet: '红色印章压住了摘要正文' }],
    },
    explanation: '调整图片环绕方式或图层顺序，确保对象不遮挡正文',
  },
  status: 'pending',
  created_at: now,
  updated_at: now,
  audit_trail: [],
};

const bodyStyleFinding: FindingContract = {
  finding_id: '33333333-3333-4333-8333-333333333333',
  document_id: 'doc-canonical',
  document_version: 1,
  rule_id: 'body_fonts',
  rule_group: '正文段落',
  rule_snapshot: {
    rule_text: '正文字体槽 宋体/Times',
    rule_version: 'vAuto',
    rule_description: '正文段落字体需要按学校模板统一',
  },
  severity: 'P2',
  confidence: 0.88,
  evidence_spans: [{ page: 1, char_start: 0, char_end: 12, snippet: '论文标题也可能出现在证据文本里' }],
  evidence_snapshot: '论文标题也可能出现在证据文本里',
  suggestion: {
    type: 'replace',
    fix_diff: {
      before: '正文局部字体未统一',
      after: '中文宋体，英文与数字 Times New Roman',
      spans_affected: [{ page: 1, char_start: 0, char_end: 12, snippet: '正文局部字体未统一' }],
    },
    explanation: '统一正文段落字体',
  },
  status: 'pending',
  created_at: now,
  updated_at: now,
  audit_trail: [],
};

const headingFinding: FindingContract = {
  finding_id: '44444444-4444-4444-8444-444444444444',
  document_id: 'doc-canonical',
  document_version: 1,
  rule_id: 'heading_hierarchy',
  rule_group: '标题层级',
  rule_snapshot: {
    rule_text: '章节标题层级',
    rule_version: 'vAuto',
    rule_description: '标题层级需要按学校模板统一',
  },
  severity: 'P2',
  confidence: 0.91,
  evidence_spans: [{ page: 1, char_start: 0, char_end: 8, snippet: '正文段落' }],
  evidence_snapshot: '正文段落',
  suggestion: {
    type: 'replace',
    fix_diff: {
      before: '标题样式不一致',
      after: '标题层级按模板统一',
      spans_affected: [{ page: 1, char_start: 0, char_end: 8, snippet: '标题样式不一致' }],
    },
    explanation: '统一标题层级',
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

  test('keeps floating-object overlap finding title instead of falling back to keep-together copy', () => {
    const paperContent = createMockPaperContent({
      title: '论文',
      header: '本科毕业论文',
      totalPages: 1,
      headings: ['摘要'],
      paragraphs: ['红色印章压住了摘要正文，阅读时已经出现明显遮挡。'],
    });

    const actions = createFixActionsFromFindings({
      findings: [overlapFinding],
      paperContent,
      schoolRuleName: '学校规则 vAuto',
      baselineRuleName: 'GB/T 7713.1-2025',
    });

    expect(actions[0].findingLabel).toBe('P1 发现 · 图片/印章覆盖正文');
    expect(actions[0].rule.name).toContain('FLOATING_OBJECT_OVERLAP_TEXT');
  });

  test('derives fix job selected types from canonical findings instead of all static fix steps', () => {
    expect(resolveFixTypeForFinding(referenceFinding)).toBe('reference_format');
    expect(resolveFixTypeForFinding(overlapFinding)).toBe('image_format');
  });

  test('binds body findings to body paragraphs instead of title blocks', () => {
    const paperContent = createMockPaperContent({
      title: '论文标题也可能出现在证据文本里',
      header: '本科毕业论文',
      totalPages: 1,
      headings: ['摘要'],
      paragraphs: ['正文局部字体未统一，需要只高亮正文段落。'],
    });

    const actions = createFixActionsFromFindings({
      findings: [bodyStyleFinding],
      paperContent,
      schoolRuleName: '学校规则 vAuto',
      baselineRuleName: 'GB/T 7713.1-2025',
    });

    expect(actions[0].locator.paragraphIndex).toBeGreaterThanOrEqual(2);
  });

  test('binds heading findings to heading blocks instead of body paragraphs', () => {
    const paperContent = createMockPaperContent({
      title: '论文标题',
      header: '本科毕业论文',
      totalPages: 1,
      headings: ['第一章 绪论'],
      paragraphs: ['正文段落里也可能出现标题规则证据，但不应该成为标题修复高亮。'],
    });

    const actions = createFixActionsFromFindings({
      findings: [headingFinding],
      paperContent,
      schoolRuleName: '学校规则 vAuto',
      baselineRuleName: 'GB/T 7713.1-2025',
    });

    expect(actions[0].locator.paragraphIndex).toBeLessThan(2);
  });

});
