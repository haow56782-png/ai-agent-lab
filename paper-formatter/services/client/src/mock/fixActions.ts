import type { PaperBlock, PaperContent, PaperRuleRef } from './paperContent';

export interface FixActionLocator {
  page: number;
  paragraphIndex: number;
  charOffset: number;
  length: number;
}

export interface FixActionRule {
  source: '学校规则' | '国标';
  name: string;
}

export interface FixAction {
  id: string;
  type: 'insert' | 'delete' | 'replace' | 'annotate';
  locator: FixActionLocator;
  payload: string;
  rule: FixActionRule;
  timestamp: number;
}

interface CreateMockFixActionsOptions {
  paperContent: PaperContent;
  schoolRuleName: string;
  baselineRuleName: string;
}

interface PageTextBlock {
  page: number;
  paragraphIndex: number;
  block: PaperBlock;
}

const ACTION_PATTERN: FixAction['type'][] = [
  'delete',
  'replace',
  'annotate',
  'replace',
  'delete',
  'annotate',
  'replace',
  'delete',
  'annotate',
  'insert',
];

const RULE_SUFFIXES = [
  '标题字号',
  '段前段后',
  '页码格式',
  '参考文献著录',
  '题注编号',
  '摘要关键词',
  '目录点线',
  '图表位置',
];

const INSERT_PAYLOADS = ['，', '；', '。', '：', '（续）'];
const REPLACE_PAYLOADS = ['GB/T 7714', '三号', '小四', '1.5 倍', '固定 23 磅', '黑体'];

function isTextBlock(block: PaperBlock): boolean {
  return block.type === 'h1' || block.type === 'h2' || block.type === 'h3' || block.type === 'p' || block.type === 'reference';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPageTextBlocks(paperContent: PaperContent): PageTextBlock[] {
  const blocks: PageTextBlock[] = [];
  paperContent.pages.forEach((page) => {
    let paragraphIndex = 0;
    page.blocks.forEach((block) => {
      if (!isTextBlock(block)) return;
      blocks.push({
        page: page.pageNumber,
        paragraphIndex,
        block,
      });
      paragraphIndex += 1;
    });
  });
  return blocks;
}

function buildRule(source: FixActionRule['source'], schoolRuleName: string, baselineRuleName: string, index: number): FixActionRule {
  const suffix = RULE_SUFFIXES[index % RULE_SUFFIXES.length];
  if (source === '学校规则') {
    return {
      source,
      name: `${schoolRuleName} · ${suffix}`,
    };
  }
  return {
    source,
    name: `${baselineRuleName} · ${suffix}`,
  };
}

function mapRuleRefToActionRule(ruleRef: PaperRuleRef, schoolRuleName: string, baselineRuleName: string): FixActionRule {
  return {
    source: ruleRef.source,
    name: ruleRef.source === '学校规则'
      ? `${schoolRuleName} · ${ruleRef.code} · ${ruleRef.name}`
      : `${baselineRuleName} · ${ruleRef.code} · ${ruleRef.name}`,
  };
}

function getPayload(type: FixAction['type'], block: PaperBlock, index: number, rule: FixActionRule): string {
  if (type === 'insert') return INSERT_PAYLOADS[index % INSERT_PAYLOADS.length];
  if (type === 'replace') return REPLACE_PAYLOADS[index % REPLACE_PAYLOADS.length];
  if (type === 'annotate') return `不符 ${rule.name}`;
  const text = Array.from(block.content.replace(/\s+/g, ''));
  return text[index % Math.max(text.length, 1)] || '×';
}

export function createMockFixActions({
  paperContent,
  schoolRuleName,
  baselineRuleName,
}: CreateMockFixActionsOptions): FixAction[] {
  const blocks = getPageTextBlocks(paperContent)
    .filter(item => Array.from(item.block.content).length >= 8);

  if (blocks.length === 0) return [];

  const targetCount = Math.max(18, Math.min(blocks.length * 2, 42));
  const actions: FixAction[] = [];
  const offsetRatios = [0.18, 0.34, 0.58, 0.76];

  for (let index = 0; index < targetCount; index += 1) {
    const blockMeta = blocks[index % blocks.length];
    const chars = Array.from(blockMeta.block.content);
    const ratio = offsetRatios[index % offsetRatios.length];
    const baseOffset = clamp(Math.floor(chars.length * ratio), 0, Math.max(chars.length - 1, 0));
    const type = ACTION_PATTERN[index % ACTION_PATTERN.length];
    const source: FixActionRule['source'] = index % 3 === 1 ? '国标' : '学校规则';
    const mappedRuleRef = blockMeta.block.ruleRefs.find(ruleRef => ruleRef.source === source);
    const rule = mappedRuleRef
      ? mapRuleRefToActionRule(mappedRuleRef, schoolRuleName, baselineRuleName)
      : buildRule(source, schoolRuleName, baselineRuleName, index);
    const length = type === 'insert' || type === 'annotate'
      ? 1
      : Math.min(type === 'replace' ? 2 : 1, Math.max(chars.length - baseOffset, 1));

    actions.push({
      id: `fix-action-${index + 1}`,
      type,
      locator: {
        page: blockMeta.page,
        paragraphIndex: blockMeta.paragraphIndex,
        charOffset: baseOffset,
        length,
      },
      payload: getPayload(type, blockMeta.block, index, rule),
      rule,
      timestamp: 5000 + (index * 4200),
    });
  }

  return actions.sort((left, right) => {
    if (left.locator.page !== right.locator.page) return left.locator.page - right.locator.page;
    if (left.locator.paragraphIndex !== right.locator.paragraphIndex) {
      return left.locator.paragraphIndex - right.locator.paragraphIndex;
    }
    return left.timestamp - right.timestamp;
  });
}
