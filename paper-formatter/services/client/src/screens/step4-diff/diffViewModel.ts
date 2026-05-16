import type { RuleHitItem } from '../../api/client';
import type { FindingContract } from '../../api/client';
import type { DiffItem, FindingDiffItem, LegacyReviewItem, PaperPage, PaperReviewAnchor, ReviewItem, RuleGroup } from './types';
import { PARAS_PER_PAGE } from './types';

export const pageDiffData: Record<number, DiffItem[]> = {
  3: [
    { action: 'replace', note: '题号按学校模板写法统一', paraIndex: 0, beforeText: '第一章 绪论', afterText: '1 绪论', hintTone: 'school' },
    { action: 'format-hint', note: '这一段按学校模板稍微放松一点', paraIndex: 1, hintTone: 'school' },
    { action: 'replace', note: '英文名称换成学校模板常用字样', paraIndex: 2, beforeText: '宋体', afterText: 'Times New Roman', hintTone: 'national' },
    { action: 'annotate', note: '这一处按学校版式往标题层级靠齐', paraIndex: 0, hintTone: 'school' },
  ],
  5: [
    { action: 'annotate', note: '这一段落字面不动，只把版式扶正', paraIndex: 0, hintTone: 'school' },
    { action: 'replace', note: '图表题名留出呼吸感', paraIndex: 2, beforeText: '表3-1', afterText: '表 3-1', hintTone: 'national' },
    { action: 'format-hint', note: '页脚位置回到模板习惯落点', paraIndex: 0, hintTone: 'school' },
    { action: 'delete', note: '这一点停顿收一下', paraIndex: 3, beforeText: '稍后', hintTone: 'school' },
  ],
  7: [
    { action: 'format-hint', note: '参考文献按国标的悬挂感整理一下', paraIndex: 0, hintTone: 'national' },
    { action: 'annotate', note: '这里把著录信息补完整，后面查验更稳', paraIndex: 1, hintTone: 'national' },
    { action: 'replace', note: '作者写法按常见著录习惯收一下', paraIndex: 1, beforeText: 'Zhang, X., et al.', afterText: 'Zhang X, et al.', hintTone: 'national' },
  ],
};

const FALLBACK_PARAGRAPH_POOL = [
  '这一段保留原文语义，只把版芯、行距和段落节奏收回到学校模板要求内。',
  '当前页的调整主要围绕标题层级、目录页码和图表题注的落点，不改变正文内容本身。',
  '这部分内容会继续按学校论文模板与国标基线逐项核对，确保交稿前的纸面风格稳定一致。',
  '参考文献、脚注与交叉引用在这一页同步复核，避免送审时被系统误判为正文内容。',
];

function getParagraphPool(texts: string[]): string[] {
  const normalized = texts.map((text) => text.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : FALLBACK_PARAGRAPH_POOL;
}

function buildSyntheticParagraph(
  paragraphPool: string[],
  pageNumber: number,
  paragraphIndex: number,
  reviewItem?: ReviewItem,
  diff?: DiffItem | null,
): string {
  if (reviewItem) {
    if (diff?.action === 'replace') {
      return `${reviewItem.current}。这里会把“${diff.beforeText || reviewItem.label}”调整为“${diff.afterText || reviewItem.target}”，让这一处更贴近 ${reviewItem.cat} 的交稿要求。`;
    }
    if (diff?.action === 'delete') {
      return `${reviewItem.current}。这一处会保留删改痕迹，让你确认“${diff.beforeText || reviewItem.label}”是否应该被收掉。`;
    }
    if (diff?.action === 'annotate') {
      return `${reviewItem.current}。页边会补一条批注，提醒你这里为什么需要按 ${reviewItem.cat} 规则再收一次。`;
    }
    if (diff?.action === 'format-hint') {
      return `${reviewItem.current}。这一段字面不变，只把版式节奏往 ${reviewItem.target} 靠齐。`;
    }
    return `${reviewItem.current}。这一处会继续整理成“${reviewItem.target}”，保证纸面呈现更接近最终交稿状态。`;
  }

  return paragraphPool[(pageNumber + paragraphIndex) % paragraphPool.length];
}

export function pageParagraphs(texts: string[], page: number): string[] {
  const start = (page - 1) * PARAS_PER_PAGE;
  return texts.slice(start, start + PARAS_PER_PAGE);
}

export function getRuleDesc(label: string): { current: string; target: string } {
  const ruleDescriptions: Record<string, { current: string; target: string }> = {
    '图片/印章覆盖正文': {
      current: '页面中的图片、印章或浮动对象压住了正文文字，影响阅读和版式判断',
      target: '调整图片环绕方式、图层顺序或锚点位置，确保对象保留但不遮挡正文',
    },
    '脚注样式不在白名单': { current: '脚注使用了不在学校白名单内的样式', target: '脚注统一切回学校允许的白名单样式' },
    '表 3-1 跨页保持完整': { current: '表格跨页时出现断裂，阅读体验不连贯', target: '跨页时保持表格结构完整，不在中间拆断' },
    '[12] 缺 DOI': { current: '参考文献 [12] 缺少 DOI 字段', target: '补全 DOI，便于学校和数据库准确识别' },
    '正文 阿拉伯 1 起': { current: '正文页码没有从阿拉伯数字 1 正确起算', target: '正文从第一页开始连续编号，前置页与正文分节分开' },
    '脚注格式不在白名单': { current: '脚注的字号与样式不在模板白名单中', target: '脚注切回学校模板允许的样式组合' },
    '缺 DOI': { current: '部分参考文献缺 DOI，著录不完整', target: '补齐 DOI，符合学校与国标要求' },
  };
  return ruleDescriptions[label] ?? {
    current: '当前格式还没有完全贴合学校论文模板和国标要求',
    target: '按学校模板和国标要求把这一处整理到可直接交稿的状态',
  };
}

export function buildFallbackRuleGroups(): RuleGroup[] {
  return [
    { cat: '页面', items: [
      { label: '页边距已按学校模板整理', status: 'pass', location: { pageIndex: 0 } },
      { label: '装订线 0', status: 'pass', location: { pageIndex: 0 } },
    ] },
    { cat: '样式', items: [
      { label: '正文字体槽 宋体/Times', status: 'pass', location: { pageIndex: 0 } },
      { label: '一级标题 段前24 段后18', status: 'pass', location: { pageIndex: 1 } },
      { label: '二级标题层级', status: 'pass', location: { pageIndex: 2 } },
      { label: '脚注样式不在白名单', status: 'warn', location: { pageIndex: 2 } },
    ] },
    { cat: '分节 & 页码', items: [
      { label: '前置页 罗马', status: 'pass', location: { pageIndex: 0 } },
      { label: '正文 阿拉伯 1 起', status: 'warn', location: { pageIndex: 1 } },
      { label: '页脚居中', status: 'pass', location: { pageIndex: 0 } },
    ] },
    { cat: '图表 & 题注', items: [
      { label: '图题居下居中', status: 'pass', location: { pageIndex: 3 } },
      { label: '表题居上', status: 'pass', location: { pageIndex: 3 } },
      { label: '表 3-1 跨页保持完整', status: 'warn', location: { pageIndex: 4 } },
    ] },
    { cat: '目录 & 域', items: [
      { label: '自动目录刷新', status: 'pass', location: { pageIndex: 1 } },
      { label: '图目录', status: 'pass', location: { pageIndex: 1 } },
    ] },
    { cat: '参考文献', items: [
      { label: 'GB/T 7714-2015 体例', status: 'pass', location: { pageIndex: 5 } },
      { label: '悬挂缩进', status: 'pass', location: { pageIndex: 5 } },
      { label: '[12] 缺 DOI', status: 'warn', location: { pageIndex: 5 } },
    ] },
  ];
}

export function inferChapter(page: number, texts: string[]): string {
  const paras = pageParagraphs(texts, page);
  const firstReadable = paras.find((item) => item.trim().length > 6)?.trim();
  if (!firstReadable) return `第 ${page} 页`;
  return firstReadable.slice(0, 18);
}

export function normalizeRuleGroups(
  rawRuleGroups: Array<{ cat: string; items: Array<RuleHitItem | [string, 'pass' | 'warn' | 'fail']> }> | undefined,
): RuleGroup[] {
  return (rawRuleGroups ?? buildFallbackRuleGroups()).map((group) => ({
    cat: group.cat,
    items: group.items.map((item): RuleHitItem => {
      if (Array.isArray(item)) return { label: item[0], status: item[1] };
      return item as RuleHitItem;
    }),
  }));
}

export function buildReviewItems(ruleGroups: RuleGroup[], parsedTexts: string[]): LegacyReviewItem[] {
  const allRules = ruleGroups.flatMap((group) => group.items);
  return allRules
    .filter((rule) => rule.status === 'warn' || rule.status === 'fail')
    .map((rule, index) => {
      const pageNum = (rule.location?.pageIndex ?? Math.min(index + 2, 12)) + 1;
      const group = ruleGroups.find((item) => item.items.includes(rule));
      const desc = getRuleDesc(rule.label);
      return {
        id: `${rule.label}-${pageNum}-${index}`,
        label: rule.label,
        cat: group?.cat || '正文',
        page: pageNum,
        current: desc.current,
        target: desc.target,
        chapter: inferChapter(pageNum, parsedTexts),
        status: rule.status as 'warn' | 'fail',
      };
    });
}

export function buildReviewItemsFromFindings(findings: FindingContract[], parsedTexts: string[]): ReviewItem[] {
  return findings.map((finding) => {
    const span = finding.evidence_spans[0];
    const pageNum = Math.max(1, span?.page ?? 1);
    const before = finding.suggestion.fix_diff?.before || finding.evidence_snapshot || span?.snippet || finding.rule_snapshot.rule_text;
    const after = finding.suggestion.fix_diff?.after || finding.suggestion.explanation || finding.rule_snapshot.rule_description || finding.rule_snapshot.rule_text;

    return {
      id: finding.finding_id,
      findingId: finding.finding_id,
      documentId: finding.document_id,
      label: finding.rule_snapshot.rule_text,
      cat: finding.rule_group || '正文',
      page: pageNum,
      current: before,
      target: after,
      chapter: inferChapter(pageNum, parsedTexts),
      status: finding.severity === 'P0' ? 'fail' : 'warn',
    };
  });
}

export function buildReviewItemsFromFindingDiffs(findingDiffs: FindingDiffItem[], parsedTexts: string[]): ReviewItem[] {
  return findingDiffs.map((diff, index) => ({
    id: diff.finding_id,
    findingId: diff.finding_id,
    label: diff.note || diff.element || `差异 ${index + 1}`,
    cat: diff.rule_group || diff.element || '正文',
    page: Math.max(1, diff.page),
    current: diff.before || diff.element || '当前格式',
    target: diff.after || diff.note || '按规范整理',
    chapter: inferChapter(Math.max(1, diff.page), parsedTexts),
    status: 'warn',
  }));
}

export function buildDiffItemsFromFindingDiffs(findingDiffs: FindingDiffItem[]): Record<number, DiffItem[]> {
  const grouped: Record<number, DiffItem[]> = {};
  findingDiffs.forEach((diff, index) => {
    const page = Math.max(1, diff.page);
    grouped[page] = grouped[page] || [];
    grouped[page].push({
      findingId: diff.finding_id,
      action: diff.action,
      note: diff.note,
      paraIndex: index % 4,
      beforeText: diff.before,
      afterText: diff.after,
      hintTone: diff.rule_id?.includes('GB') ? 'national' : 'school',
    });
  });
  return grouped;
}

export function buildPaperPages(pageList: number[], parsedTexts: string[], reviewItems: ReviewItem[], formatterDiffs: Record<number, DiffItem[]> = {}): PaperPage[] {
  const paragraphPool = getParagraphPool(parsedTexts);
  return pageList.map((pageNumber) => ({
    pageNumber,
    ...(() => {
      const diffs = formatterDiffs[pageNumber] ?? pageDiffData[pageNumber] ?? [];
      const reviewList = reviewItems.filter((item) => item.page === pageNumber);
      const reviewAnchors = reviewList.map((item, index): PaperReviewAnchor => ({
        findingId: item.findingId,
        paragraphIndex: (
          diffs.find((diff) => diff.findingId === item.findingId)?.paraIndex
          ?? diffs[index]?.paraIndex
          ?? Math.min(index, 7)
        ),
        diff: diffs.find((diff) => diff.findingId === item.findingId)
          ?? diffs[index]
          ?? diffs[Math.min(index, Math.max(diffs.length - 1, 0))]
          ?? null,
      }));
      const baseParagraphs = pageParagraphs(parsedTexts, pageNumber)
        .filter((item) => item.trim().length > 0)
        .slice(0, 8);
      const requiredParagraphs = Math.max(
        baseParagraphs.length,
        4,
        ...reviewAnchors.map((anchor) => anchor.paragraphIndex + 1),
      );
      const paragraphList = Array.from({ length: requiredParagraphs }, (_, paragraphIndex) => {
        if (baseParagraphs[paragraphIndex]) return baseParagraphs[paragraphIndex];
        const anchor = reviewAnchors.find((item) => item.paragraphIndex === paragraphIndex);
        const reviewItem = anchor ? reviewList.find((item) => item.findingId === anchor.findingId) : undefined;
        return buildSyntheticParagraph(paragraphPool, pageNumber, paragraphIndex, reviewItem, anchor?.diff);
      });

      return {
        paragraphList,
        diffs,
        reviewList,
        chapter: reviewList[0]?.chapter || inferChapter(pageNumber, paragraphPool),
        reviewAnchors,
      };
    })(),
  }));
}
