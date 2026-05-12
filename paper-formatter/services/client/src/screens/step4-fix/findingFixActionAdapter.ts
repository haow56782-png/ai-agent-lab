import type { FindingContract, FixJobArtifact, FixJobEvent, FixStatusResponse, FixType, RuleHitItem } from '../../api/client';
import type { AppState, SchoolOption } from '../../components/AppFrame';
import type { FixAction, FixActionRule } from '../../mock/fixActions';
import type { PaperBlock, PaperContent, PaperPage } from '../../mock/paperContent';
import { getPageTextBlocks } from '../../components/fix-runtime/utils';

type RuleHitStatus = 'pass' | 'warn' | 'fail';

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

function stableFindingId(seed: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  const padded = `${hex}${hex.split('').reverse().join('')}${hex}${hex}`.slice(0, 32);
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-4${padded.slice(13, 16)}-8${padded.slice(17, 20)}-${padded.slice(20, 32)}`;
}

function toRuleId(cat: string, label: string): string {
  const token = `${cat}_${label}`
    .replace(/[^A-Za-z0-9\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 48) || 'FORMAT_REVIEW';
  return `RULE-L2-${token}`;
}

function normalizeRuleHit(item: RuleHitItem | [string, RuleHitStatus]): { label: string; status: RuleHitStatus; page: number } | null {
  if (Array.isArray(item)) {
    return { label: item[0], status: item[1], page: 1 };
  }
  const status = item.status === 'fail' ? 'fail' : item.status === 'warn' ? 'warn' : 'pass';
  return {
    label: item.label,
    status,
    page: Math.max(1, (item.location?.pageIndex ?? 0) + 1),
  };
}

function buildSuggestion(label: string, evidence: string, status: RuleHitStatus): FindingContract['suggestion'] {
  if (status === 'fail') {
    return {
      type: 'replace',
      fix_diff: {
        before: evidence,
        after: `按规范修正“${label}”`,
        spans_affected: [],
      },
      explanation: `按规范修正“${label}”`,
    };
  }
  return {
    type: 'manual_only',
    explanation: `请核对“${label}”是否符合学校规则与国标基线。`,
  };
}

export function collectRuntimeFindings({
  state,
  school,
  canonicalDocumentId,
  parsedTexts,
}: RuntimeFindingInput): FindingContract[] {
  const canonicalFindings = state.parseResults?.findings ?? [];
  if (canonicalFindings.length > 0) return canonicalFindings;

  const now = new Date().toISOString();
  const ruleGroups = state.parseResults?.ruleDetails as Array<{ cat: string; items: Array<RuleHitItem | [string, RuleHitStatus]> }> | undefined;
  const findings: FindingContract[] = [];

  ruleGroups?.forEach((group, groupIndex) => {
    group.items.forEach((rawItem, itemIndex) => {
      const item = normalizeRuleHit(rawItem);
      if (!item || item.status === 'pass') return;
      const evidence = parsedTexts[itemIndex % Math.max(parsedTexts.length, 1)] || `${group.cat} · ${item.label}`;
      const ruleId = toRuleId(group.cat, item.label);
      const findingId = stableFindingId(`${canonicalDocumentId}:${group.cat}:${item.label}:${item.page}:${groupIndex}:${itemIndex}`);
      const evidenceSpan = {
        page: item.page,
        char_start: 0,
        char_end: Math.max(1, evidence.length),
        snippet: evidence,
      };
      const suggestion = buildSuggestion(item.label, evidence, item.status);
      findings.push({
        finding_id: findingId,
        document_id: canonicalDocumentId,
        document_version: 1,
        rule_id: ruleId,
        rule_group: group.cat,
        rule_snapshot: {
          rule_text: item.label,
          rule_version: school?.version || 'vAuto',
          rule_description: group.cat,
        },
        severity: item.status === 'fail' ? 'P0' : findings.length === 0 ? 'P1' : 'P2',
        confidence: item.status === 'fail' ? 0.92 : 0.78,
        evidence_spans: [evidenceSpan],
        evidence_snapshot: evidence,
        cross_page: false,
        is_global: false,
        suggestion: {
          ...suggestion,
          fix_diff: suggestion.fix_diff
            ? { ...suggestion.fix_diff, spans_affected: [evidenceSpan] }
            : undefined,
        },
        status: 'pending',
        created_at: now,
        updated_at: now,
        audit_trail: [],
      });
    });
  });

  return findings;
}

function isTextBlock(block: PaperBlock): boolean {
  return block.type === 'h1' || block.type === 'h2' || block.type === 'h3' || block.type === 'p' || block.type === 'reference';
}

function findParagraphIndex(page: PaperPage, snippet: string, fallbackIndex: number): number {
  const blocks = getPageTextBlocks(page).filter(item => isTextBlock(item.block));
  if (blocks.length === 0) return 0;
  const normalizedSnippet = snippet.replace(/\s+/g, '');
  const direct = blocks.find(item => item.block.content.replace(/\s+/g, '').includes(normalizedSnippet.slice(0, 18)));
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
    image_format: /图片|图题/i,
    punctuation: /标点/i,
  };
  const matcher = fixType ? tokens[fixType] : undefined;
  const matched = matcher
    ? findings.find((finding) => matcher.test(`${finding.rule_group || ''} ${finding.rule_id} ${finding.rule_snapshot.rule_text} ${finding.rule_snapshot.rule_description || ''}`))
    : null;
  return matched ?? findings[index % findings.length] ?? null;
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
      const paragraphIndex = page ? findParagraphIndex(page, evidence?.snippet || finding.evidence_snapshot, index) : 0;
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
