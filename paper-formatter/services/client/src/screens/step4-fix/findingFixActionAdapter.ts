import type { FindingContract, FixJobArtifact, FixJobEvent, FixStatusResponse, FixType } from '../../api/client';
import type { AppState, SchoolOption } from '../../components/AppFrame';
import type { FixAction, FixActionRule } from '../../mock/fixActions';
import type { PaperBlock, PaperContent, PaperPage } from '../../mock/paperContent';
import { getPageTextBlocks } from '../../components/fix-runtime/utils';

interface RuntimeFindingInput {
  state: AppState;
  school: SchoolOption | null;
  canonicalDocumentId: string;
  parsedTexts: string[];
}

interface RuntimeFixActionInput {
  findings: FindingContract[];
  paperContent: PaperContent;
  schoolRuleName: string;
  baselineRuleName: string;
}

type FindingLinkedArtifact = FixJobArtifact & { finding_id?: string; related_finding_ids?: string[] };
type FindingLinkedEvent = FixJobEvent & { finding_id?: string; related_finding_ids?: string[] };
type FindingPaperTarget = 'page_layout' | 'heading' | 'paragraph' | 'reference' | 'generic_text';

export function collectRuntimeFindings({
  state,
}: RuntimeFindingInput): FindingContract[] {
  return state.parseResults?.findings ?? [];
}

function isTextBlock(block: PaperBlock): boolean {
  return block.type === 'h1' || block.type === 'h2' || block.type === 'h3' || block.type === 'p' || block.type === 'reference';
}

function resolveFindingPaperTarget(finding: FindingContract): FindingPaperTarget {
  const signal = `${finding.rule_group || ''} ${finding.rule_id} ${finding.rule_snapshot.rule_text} ${finding.rule_snapshot.rule_description || ''}`;
  if (/页边距|版芯|版心|页面|纸张|装订线|page_canvas|margin/i.test(signal)) return 'page_layout';
  if (/参考文献|著录|DOI|7714/i.test(signal)) return 'reference';
  if (/标题|题名|章节|层级|heading/i.test(signal)) return 'heading';
  if (/正文|段落|字体|字号|行距|缩进|首行|body|paragraph/i.test(signal)) return 'paragraph';
  return 'generic_text';
}

function isTargetBlock(block: PaperBlock, target: FindingPaperTarget): boolean {
  if (target === 'heading') return block.type === 'h1' || block.type === 'h2' || block.type === 'h3';
  if (target === 'paragraph') return block.type === 'p';
  if (target === 'reference') return block.type === 'reference';
  if (target === 'page_layout') return block.type === 'p';
  return isTextBlock(block);
}

function findParagraphIndex(page: PaperPage, snippet: string, fallbackIndex: number, target: FindingPaperTarget): number {
  const allTextBlocks = getPageTextBlocks(page).filter(item => isTextBlock(item.block));
  const targetBlocks = allTextBlocks.filter(item => isTargetBlock(item.block, target));
  const blocks = targetBlocks.length > 0 ? targetBlocks : allTextBlocks;
  if (blocks.length === 0) return 0;
  const normalizedSnippet = snippet.replace(/\s+/g, '');
  const snippetNeedle = normalizedSnippet.slice(0, 18);
  const direct = snippetNeedle
    ? blocks.find(item => item.block.content.replace(/\s+/g, '').includes(snippetNeedle))
    : null;
  if (direct) return direct.paragraphIndex;
  return blocks[Math.abs(fallbackIndex) % blocks.length]?.paragraphIndex ?? 0;
}

function resolveCharOffset(page: PaperPage, paragraphIndex: number, finding: FindingContract, actionIndex: number): number {
  const target = getPageTextBlocks(page).find(item => item.paragraphIndex === paragraphIndex);
  const content = target?.block.content ?? '';
  if (!content) return 0;
  const snippet = finding.evidence_spans[0]?.snippet || finding.evidence_snapshot;
  const snippetIndex = snippet ? content.indexOf(snippet.slice(0, Math.min(snippet.length, 12))) : -1;
  if (snippetIndex >= 0) return snippetIndex;
  const chars = Array.from(content);
  const ratios = [0.18, 0.42, 0.66, 0.78];
  return Math.min(chars.length - 1, Math.max(0, Math.floor(chars.length * ratios[actionIndex % ratios.length])));
}

function resolveActionType(finding: FindingContract): FixAction['type'] {
  if (finding.suggestion.type === 'insert') return 'insert';
  if (finding.suggestion.type === 'delete') return 'delete';
  if (finding.suggestion.type === 'replace' || finding.suggestion.type === 'restructure') return 'replace';
  return 'annotate';
}

function resolveRule(finding: FindingContract, schoolRuleName: string, baselineRuleName: string): FixActionRule {
  const isBaseline = /GB\/T|7713|7714|国标/i.test(`${finding.rule_id} ${finding.rule_snapshot.rule_version} ${finding.rule_snapshot.rule_text}`);
  const source: FixActionRule['source'] = isBaseline ? '国标' : '学校规则';
  const prefix = source === '国标' ? baselineRuleName : schoolRuleName;
  return {
    source,
    name: `${prefix} · ${finding.rule_id} · ${finding.rule_snapshot.rule_text}`,
  };
}

function resolvePayload(finding: FindingContract, actionType: FixAction['type'], rule: FixActionRule): string {
  if (actionType === 'annotate') return `不符 ${rule.name}`;
  const after = finding.suggestion.fix_diff?.after || finding.suggestion.explanation;
  if (actionType === 'delete') return finding.suggestion.fix_diff?.before || finding.evidence_snapshot.slice(0, 1) || '×';
  return after || '按规范修正';
}

function pickFindingForFixType(fixType: FixType | undefined, findings: FindingContract[], index: number): FindingContract | null {
  if (findings.length === 0) return null;
  const tokens: Partial<Record<FixType, RegExp>> = {
    margin: /页边距|版芯|正文/i,
    body_style: /正文|字体|行距/i,
    heading: /标题|题名|章节/i,
    page_number: /页码|目录/i,
    cover: /封面|声明|题名页/i,
    toc: /目录|页码/i,
    abstract_format: /摘要|关键词/i,
    cross_ref: /交叉引用|引用/i,
    caption: /图表|题注/i,
    reference_format: /参考文献|著录|DOI/i,
    table_format: /表格|三线表/i,
    image_format: /图片|图题|印章|水印|浮动对象|覆盖正文|shape/i,
    punctuation: /标点/i,
  };
  const matcher = fixType ? tokens[fixType] : undefined;
  const matched = matcher
    ? findings.find((finding) => matcher.test(`${finding.rule_group || ''} ${finding.rule_id} ${finding.rule_snapshot.rule_text} ${finding.rule_snapshot.rule_description || ''}`))
    : null;
  return matched ?? findings[index % findings.length] ?? null;
}

export function resolveFixTypeForFinding(finding: FindingContract): FixType {
  const haystack = `${finding.rule_group || ''} ${finding.rule_id} ${finding.rule_snapshot.rule_text} ${finding.rule_snapshot.rule_description || ''}`;
  if (/图片|印章|水印|浮动对象|覆盖正文|shape/i.test(haystack)) return 'image_format';
  if (/页边距|版芯|装订线/i.test(haystack)) return 'margin';
  if (/正文|字体|行距|缩进|样式/i.test(haystack)) return 'body_style';
  if (/标题|题名|章节|层级/i.test(haystack)) return 'heading';
  if (/页码|页脚|分节/i.test(haystack)) return 'page_number';
  if (/封面|声明|题名页/i.test(haystack)) return 'cover';
  if (/目录|TOC/i.test(haystack)) return 'toc';
  if (/摘要|关键词/i.test(haystack)) return 'abstract_format';
  if (/交叉引用|引用/i.test(haystack)) return 'cross_ref';
  if (/图题|表题|题注|caption/i.test(haystack)) return 'caption';
  if (/参考文献|著录|DOI|7714/i.test(haystack)) return 'reference_format';
  if (/表格|三线表|keep-together/i.test(haystack)) return 'table_format';
  if (/标点/i.test(haystack)) return 'punctuation';
  return 'body_style';
}

function hasFindingLink(item: { finding_id?: string; related_finding_ids?: string[] }): boolean {
  return !!item.finding_id || !!item.related_finding_ids?.length;
}

export function attachFindingsToFixStatus(status: FixStatusResponse, findings: FindingContract[]): FixStatusResponse {
  if (findings.length === 0) return status;
  return {
    ...status,
    events: status.events?.map((event, index): FindingLinkedEvent => {
      if (hasFindingLink(event)) return event;
      const finding = pickFindingForFixType(event.fixType, findings, index);
      return finding
        ? { ...event, finding_id: finding.finding_id, related_finding_ids: [finding.finding_id] }
        : event;
    }),
    artifacts: status.artifacts?.map((artifact, index): FindingLinkedArtifact => {
      if (hasFindingLink(artifact)) return artifact;
      const finding = pickFindingForFixType(artifact.fixType, findings, index);
      return finding
        ? { ...artifact, finding_id: finding.finding_id, related_finding_ids: [finding.finding_id] }
        : artifact;
    }),
  };
}

export function createFixActionsFromFindings({
  findings,
  paperContent,
  schoolRuleName,
  baselineRuleName,
}: RuntimeFixActionInput): FixAction[] {
  if (findings.length === 0) return [];

  const targetCount = Math.max(18, Math.min(42, findings.length * 14));
  return Array.from({ length: targetCount }, (_, index): FixAction => {
      const finding = findings[index % findings.length];
      const evidence = finding.evidence_spans[0];
      const pageNumber = Math.min(Math.max(evidence?.page ?? 1, 1), Math.max(paperContent.pages.length, 1));
      const page = paperContent.pages[pageNumber - 1] ?? paperContent.pages[0];
      const paperTarget = resolveFindingPaperTarget(finding);
      const paragraphIndex = page ? findParagraphIndex(page, evidence?.snippet || finding.evidence_snapshot, index, paperTarget) : 0;
      const baseType = resolveActionType(finding);
      const actionType: FixAction['type'] = baseType === 'annotate'
        ? (index % 3 === 0 ? 'annotate' : index % 3 === 1 ? 'replace' : 'delete')
        : baseType;
      const rule = resolveRule(finding, schoolRuleName, baselineRuleName);
      return {
        id: `fix-action-${index + 1}-${finding.finding_id}`,
        findingId: finding.finding_id,
        findingLabel: `${finding.severity} 发现 · ${finding.rule_snapshot.rule_text}`,
        type: actionType,
        locator: {
          page: pageNumber,
          paragraphIndex,
          charOffset: page ? resolveCharOffset(page, paragraphIndex, finding, index) : 0,
          length: Math.max(1, Math.min(4, (finding.suggestion.fix_diff?.before || finding.evidence_snapshot || '').length || 1)),
        },
        payload: resolvePayload(finding, actionType, rule),
        rule,
        timestamp: 5000 + (index * 4200),
      };
    })
    .sort((left, right) => {
      if (left.locator.page !== right.locator.page) return left.locator.page - right.locator.page;
      if (left.locator.paragraphIndex !== right.locator.paragraphIndex) return left.locator.paragraphIndex - right.locator.paragraphIndex;
      return left.timestamp - right.timestamp;
    });
}
