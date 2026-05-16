import type { Page } from '@playwright/test';
import { APP_STATE_BOOTSTRAP_KEY } from '../../src/test-support/bootstrapAppState';

export const step5StorageKey = 'paper-formatter:step4diff:demo';

const baseParseResults = {
  findings: [
    {
      finding_id: '672fca73-37ac-4276-872f-ca73672fca73',
      document_id: '11111111-1111-4111-8111-111111111111',
      document_version: 1,
      rule_id: 'HEADING_HIERARCHY_REVIEW',
      rule_group: '标题层级',
      rule_snapshot: {
        rule_text: '章节标题编号格式修正',
        rule_version: 'vAuto',
        rule_description: '学校要求章节标题层级和编号保持一致。',
      },
      severity: 'P1',
      confidence: 0.88,
      evidence_spans: [{ page: 3, char_start: 0, char_end: 24, snippet: '第一章 绪论' }],
      evidence_snapshot: '第一章 绪论',
      suggestion: {
        type: 'replace',
        fix_diff: {
          before: '第一章 绪论',
          after: '1 绪论',
          spans_affected: [{ page: 3, char_start: 0, char_end: 24, snippet: '第一章 绪论' }],
        },
        explanation: '将章节标题编号调整为学校模板要求的层级格式。',
      },
      status: 'pending',
      created_at: '2026-05-12T00:00:00.000Z',
      updated_at: '2026-05-12T00:00:00.000Z',
      audit_trail: [],
    },
    {
      finding_id: '86255e9e-e9e5-4268-8625-5e9e86255e9e',
      document_id: '11111111-1111-4111-8111-111111111111',
      document_version: 1,
      rule_id: 'FOOTNOTE_STYLE_REVIEW',
      rule_group: '脚注',
      rule_snapshot: {
        rule_text: '脚注格式不在白名单',
        rule_version: 'vAuto',
        rule_description: '脚注字号和样式需要回到学校模板允许范围。',
      },
      severity: 'P2',
      confidence: 0.82,
      evidence_spans: [{ page: 5, char_start: 0, char_end: 18, snippet: '脚注格式不在白名单' }],
      evidence_snapshot: '脚注格式不在白名单',
      suggestion: {
        type: 'replace',
        fix_diff: {
          before: '脚注格式不在白名单',
          after: '脚注切回学校模板允许的样式组合',
          spans_affected: [{ page: 5, char_start: 0, char_end: 18, snippet: '脚注格式不在白名单' }],
        },
        explanation: '脚注切回学校模板允许的样式组合。',
      },
      status: 'pending',
      created_at: '2026-05-12T00:00:00.000Z',
      updated_at: '2026-05-12T00:00:00.000Z',
      audit_trail: [],
    },
    {
      finding_id: '09e836f4-4f63-4e90-89e8-36f409e836f4',
      document_id: '11111111-1111-4111-8111-111111111111',
      document_version: 1,
      rule_id: 'RULE-L2-REFERENCE_DOI',
      rule_group: '参考文献',
      rule_snapshot: {
        rule_text: '缺 DOI',
        rule_version: 'vAuto',
        rule_description: '参考文献著录需要补齐 DOI。',
      },
      severity: 'P2',
      confidence: 0.84,
      evidence_spans: [{ page: 7, char_start: 0, char_end: 16, snippet: '参考文献缺少 DOI 信息' }],
      evidence_snapshot: '参考文献缺少 DOI 信息',
      suggestion: {
        type: 'replace',
        fix_diff: {
          before: '参考文献缺少 DOI 信息',
          after: '补齐 DOI，符合学校与国标要求',
          spans_affected: [{ page: 7, char_start: 0, char_end: 16, snippet: '参考文献缺少 DOI 信息' }],
        },
        explanation: '补齐 DOI，符合学校与国标要求。',
      },
      status: 'pending',
      created_at: '2026-05-12T00:00:00.000Z',
      updated_at: '2026-05-12T00:00:00.000Z',
      audit_trail: [],
    },
  ],
  items: [
    { k: '封面', conf: 0.99 },
    { k: '摘要', conf: 0.98 },
    { k: '目录', conf: 0.96 },
    { k: '正文', conf: 0.97 },
  ],
  log: ['解析完成', '规则预匹配完成'],
  rules: { passed: 14, warnings: 3, failed: 0 },
  ruleDetails: [
    {
      cat: '正文',
      items: [
        { label: '章节标题', status: 'warn', location: { pageIndex: 2 } },
        { label: '脚注格式不在白名单', status: 'warn', location: { pageIndex: 4 } },
      ],
    },
    {
      cat: '参考文献',
      items: [
        { label: '缺 DOI', status: 'warn', location: { pageIndex: 6 } },
      ],
    },
  ],
  parsedTexts: [
    '本文围绕论文排版中的标题层级、页码、图表题注与参考文献一致性展开研究，并以真实底稿逐页校对样式差异。',
    '通过学校规范与国标基线的逐条映射，可以在不改变正文语义的前提下恢复字体、行距、缩进与页码节奏。',
    '实验部分针对摘要、目录、脚注、参考文献与交叉引用等高频问题建立了逐页检查机制，使交稿前的纸面更稳定。',
  ],
  rawHeadings: ['摘要', '第一章 绪论', '第二章 研究方法', '结论'],
};

export function seedAppStatePatch(step: 3 | 4 | 5 | 6) {
  return {
    step,
    doc: {
      name: '2026毕业论文.docx',
      size: '1.2 MB',
      pages: 72,
    },
    rawFile: null,
    documentIdentity: {
      legacyDocId: 'demo-doc',
      canonicalDocumentId: '11111111-1111-4111-8111-111111111111',
    },
    analyzeJobId: 'demo',
    formatJobId: 'demo',
    fixJobId: 'demo',
    jobStatus: 'completed',
    uploadPct: 100,
    uploadStage: 'done',
    schoolId: null,
    parsePct: 100,
    parsePhase: 3,
    parseDone: true,
    parseResults: baseParseResults,
    exporting: false,
    exported: false,
    diffPage: 3,
    activeRuleId: null,
    showRulesModal: false,
    draftSchool: null,
    detectedSchool: null,
    detecting: false,
  };
}

export async function bootstrapState(page: Page, patch: ReturnType<typeof seedAppStatePatch>) {
  await page.addInitScript(
    ([storageKey, nextPatch]) => {
      const cleanupKey = 'paper-formatter:test:step4diff-cleaned';
      if (!window.sessionStorage.getItem(cleanupKey)) {
        window.localStorage.removeItem('paper-formatter:step4diff:demo');
        window.sessionStorage.setItem(cleanupKey, '1');
      }
      window.sessionStorage.setItem(storageKey, JSON.stringify(nextPatch));
    },
    [APP_STATE_BOOTSTRAP_KEY, patch] as const,
  );
}

export async function getStep5StoredState(page: Page) {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) as {
      ruleActions?: Array<[string, 'accepted' | 'ignored']>;
      activeRuleId?: string | null;
      page?: number;
    } : null;
  }, step5StorageKey);
}
