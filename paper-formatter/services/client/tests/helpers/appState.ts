import type { Page } from '@playwright/test';
import { APP_STATE_BOOTSTRAP_KEY } from '../../src/test-support/bootstrapAppState';

export const step5StorageKey = 'paper-formatter:step4diff:demo';

const baseParseResults = {
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

export function seedAppStatePatch(step: 3 | 4 | 5) {
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
    jobId: 'demo',
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
