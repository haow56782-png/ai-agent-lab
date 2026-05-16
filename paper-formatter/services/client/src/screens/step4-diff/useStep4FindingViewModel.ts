import { useMemo } from 'react';
import type { DiffResult, FindingContract, RuleHitItem } from '../../api/client';
import type { SchoolOption } from '../../components/AppFrame';
import { useReviewStore, type Finding } from '../../stores/reviewStore';
import {
  buildDiffItemsFromFindingDiffs,
  buildPaperPages,
  buildReviewItems,
  buildReviewItemsFromFindingDiffs,
  buildReviewItemsFromFindings,
  normalizeRuleGroups,
  pageDiffData,
} from './diffViewModel';
import { toContractRuleId, toStableFindingId } from './findingIdentity';

type RawRuleGroup = {
  cat: string;
  items: Array<RuleHitItem | [string, 'pass' | 'warn' | 'fail']>;
};

interface Step4FindingViewModelInput {
  canonicalDocumentId: string | null;
  documentPageCount: number;
  diffResult: DiffResult | null;
  parseResultFindings: FindingContract[];
  parsedTexts: string[];
  rawRuleGroups: RawRuleGroup[] | undefined;
  school: SchoolOption | null;
  serverFindings: FindingContract[];
}

export function useStep4FindingViewModel({
  canonicalDocumentId,
  documentPageCount,
  diffResult,
  parseResultFindings,
  parsedTexts,
  rawRuleGroups,
  school,
  serverFindings,
}: Step4FindingViewModelInput) {
  const storeFindings = useReviewStore((reviewState) => reviewState.findings);
  const canonicalFindings = parseResultFindings.length > 0 ? parseResultFindings : serverFindings;
  const hasCanonicalFindings = canonicalFindings.length > 0;
  const ruleGroups = useMemo(() => normalizeRuleGroups(rawRuleGroups), [rawRuleGroups]);
  const formatterFindingDiffs = useMemo(() => diffResult?.findingDiffs ?? [], [diffResult?.findingDiffs]);
  const formatterDiffItems = useMemo(() => buildDiffItemsFromFindingDiffs(formatterFindingDiffs), [formatterFindingDiffs]);
  const hasFormatterFindingDiffs = formatterFindingDiffs.length > 0;
  const rawReviewItems = useMemo(() => (
    hasFormatterFindingDiffs
      ? buildReviewItemsFromFindingDiffs(formatterFindingDiffs, parsedTexts)
      : hasCanonicalFindings
      ? buildReviewItemsFromFindings(canonicalFindings, parsedTexts)
      : buildReviewItems(ruleGroups, parsedTexts)
  ), [canonicalFindings, formatterFindingDiffs, hasCanonicalFindings, hasFormatterFindingDiffs, parsedTexts, ruleGroups]);
  const reviewItems = useMemo(() => rawReviewItems.map((reviewItem) => {
    const sourceFinding = reviewItem.findingId
      ? canonicalFindings.find((finding) => finding.finding_id === reviewItem.findingId)
      : undefined;
    const findingId = sourceFinding?.finding_id
      ?? reviewItem.findingId
      ?? toStableFindingId(`${canonicalDocumentId || 'demo-document'}:${reviewItem.id}`);
    return {
      ...reviewItem,
      id: findingId,
      findingId,
    };
  }), [canonicalDocumentId, canonicalFindings, rawReviewItems]);
  const allRules = useMemo(() => ruleGroups.flatMap((ruleGroup) => ruleGroup.items), [ruleGroups]);
  const maxDiffPage = Math.max(
    1,
    documentPageCount,
    diffResult?.summary?.pages || 0,
    ...reviewItems.map((reviewItem) => reviewItem.page),
    ...Object.keys(hasFormatterFindingDiffs ? formatterDiffItems : pageDiffData).map(Number),
  );
  const pageList = useMemo(() => Array.from({ length: maxDiffPage }, (_, pageIndex) => pageIndex + 1), [maxDiffPage]);
  const paperPages = useMemo(
    () => buildPaperPages(pageList, parsedTexts, reviewItems, hasFormatterFindingDiffs ? formatterDiffItems : {}),
    [formatterDiffItems, hasFormatterFindingDiffs, pageList, parsedTexts, reviewItems],
  );

  const findings = useMemo<Finding[]>(() => reviewItems.map((reviewItem, reviewIndex) => {
    const sourceFinding = reviewItem.findingId
      ? canonicalFindings.find((finding) => finding.finding_id === reviewItem.findingId)
      : undefined;
    const paperPage = paperPages.find((page) => page.pageNumber === reviewItem.page);
    const anchor = paperPage?.reviewAnchors.find((candidate) => candidate.findingId === reviewItem.findingId);
    const now = new Date().toISOString();
    const evidenceSpan = sourceFinding?.evidence_spans[0] ?? {
      page: reviewItem.page,
      char_start: 0,
      char_end: Math.max(reviewItem.current.length, 1),
      snippet: reviewItem.current,
      context_before: paperPage?.paragraphList[Math.max(0, (anchor?.paragraphIndex ?? 0) - 1)]?.slice(0, 50),
      context_after: paperPage?.paragraphList[(anchor?.paragraphIndex ?? 0) + 1]?.slice(0, 50),
    };
    const contractRuleId = sourceFinding?.rule_id ?? toContractRuleId(reviewItem.cat, reviewItem.label);
    const contractFindingId = sourceFinding?.finding_id ?? reviewItem.findingId ?? reviewItem.id;
    const sourceStatus = sourceFinding?.status === 'accepted' || sourceFinding?.status === 'rejected' || sourceFinding?.status === 'self_edited'
      ? sourceFinding.status
      : 'pending';
    return {
      finding_id: contractFindingId,
      document_id: sourceFinding?.document_id ?? canonicalDocumentId ?? 'demo-document',
      document_version: sourceFinding?.document_version ?? 1,
      pageNo: reviewItem.page,
      anchorRect: {
        x: 0,
        y: (anchor?.paragraphIndex ?? reviewIndex) * 100,
        w: 100,
        h: 28,
      },
      ruleId: contractRuleId,
      rule_id: contractRuleId,
      rule_group: sourceFinding?.rule_group ?? reviewItem.cat,
      rule_snapshot: sourceFinding?.rule_snapshot ?? {
        rule_text: reviewItem.label,
        rule_version: school?.version || 'vAuto',
        rule_description: reviewItem.target,
      },
      ruleBreadcrumb: [
        school?.name ? `${school.name} vAuto` : '学校规则 vAuto',
        reviewItem.cat,
        reviewItem.label,
      ],
      problem: reviewItem.current,
      suggestionText: reviewItem.target,
      before: reviewItem.current,
      after: reviewItem.target,
      severity: sourceFinding?.severity ?? (reviewItem.status === 'fail' ? 'P0' : reviewIndex === 0 ? 'P1' : 'P2'),
      confidence: sourceFinding?.confidence ?? (reviewItem.status === 'fail' ? 0.92 : reviewIndex === 0 ? 0.82 : 0.68),
      evidence_spans: sourceFinding?.evidence_spans ?? [evidenceSpan],
      evidence_snapshot: sourceFinding?.evidence_snapshot ?? reviewItem.current,
      cross_page: sourceFinding?.cross_page ?? false,
      is_global: sourceFinding?.is_global ?? false,
      suggestion: sourceFinding?.suggestion ?? {
        type: 'replace',
        fix_diff: {
          before: reviewItem.current,
          after: reviewItem.target,
          spans_affected: [evidenceSpan],
        },
        explanation: reviewItem.target,
      },
      status: sourceStatus,
      created_at: sourceFinding?.created_at ?? now,
      updated_at: sourceFinding?.updated_at ?? now,
      audit_trail: sourceFinding?.audit_trail ?? [],
    };
  }), [canonicalDocumentId, canonicalFindings, paperPages, reviewItems, school]);
  const findingsHydrationKey = useMemo(() => findings.map((finding) => (
    [
      finding.finding_id,
      finding.status,
      finding.pageNo,
      finding.anchorRect.x,
      finding.anchorRect.y,
      finding.anchorRect.w,
      finding.anchorRect.h,
      finding.updated_at,
    ].join(':')
  )).join('|'), [findings]);
  const stableHydrationFindings = useMemo(() => findings, [findingsHydrationKey]);
  const findingIdSet = useMemo(() => new Set(findings.map((finding) => finding.finding_id)), [findings]);
  const effectiveFindings = storeFindings.length === findings.length && storeFindings.every((finding) => findingIdSet.has(finding.finding_id))
    ? storeFindings
    : findings;

  return {
    allRules,
    canonicalFindings,
    effectiveFindings,
    findings,
    findingsHydrationKey,
    hasCanonicalFindings,
    paperPages,
    stableHydrationFindings,
  };
}
