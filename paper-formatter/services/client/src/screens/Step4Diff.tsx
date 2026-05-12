import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, findSchoolById, getCanonicalDocumentId, getLegacyDocumentId } from '../components/AppFrame';
import type { DiffResult, FindingContract, RuleHitItem } from '../api/client';
import { api } from '../api/client';
import { ExportOverlay } from '../components/ExportOverlay';
import { ExportConfirmDialog } from '../components/ExportConfirmDialog';
import { Btn } from '../components/Common';
import { Canvas } from '../components/review-workbench/Canvas';
import { FindingPane } from '../components/review-workbench/FindingPane';
import { RulePane } from '../components/review-workbench/RulePane';
import { reviewActions, useReviewStore, type Finding } from '../stores/reviewStore';
import { createDiffTranslator } from './step4-diff/diffCopy';
import {
  buildDiffItemsFromFindingDiffs,
  buildPaperPages,
  buildReviewItems,
  buildReviewItemsFromFindingDiffs,
  buildReviewItemsFromFindings,
  normalizeRuleGroups,
  pageDiffData,
} from './step4-diff/diffViewModel';
import { useDiffReviewController } from './step4-diff/useDiffReviewController';

interface Props {
  showToast: (msg: string) => void;
}

function toContractRuleId(cat: string, label: string) {
  const token = `${cat}_${label}`
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 48) || 'FORMAT_REVIEW';
  return `RULE-L2-${token}`;
}

function toStableFindingId(seed: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  const padded = `${hex}${hex.split('').reverse().join('')}${hex}${hex}`.slice(0, 32);
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-4${padded.slice(13, 16)}-8${padded.slice(17, 20)}-${padded.slice(20, 32)}`;
}

const Step4Diff: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const { copy, t } = createDiffTranslator('zh-CN');

  const focusFindingIdRef = useRef<string | null>(null);
  const findingsRef = useRef<Finding[]>([]);

  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showExemptionConfirm, setShowExemptionConfirm] = useState(false);
  const [exemptionReason, setExemptionReason] = useState('');
  const [exemptionRiskAccepted, setExemptionRiskAccepted] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [exportFileNameEditing, setExportFileNameEditing] = useState(false);
  const [serverFindings, setServerFindings] = useState<FindingContract[]>([]);

  const school = findSchoolById(state.schoolId);
  const parsedTexts = useMemo(() => state.parseResults?.parsedTexts ?? [], [state.parseResults?.parsedTexts]);
  const legacyDocId = getLegacyDocumentId(state);
  const canonicalDocumentId = getCanonicalDocumentId(state);
  const parseResultFindings = state.parseResults?.findings ?? [];
  const canonicalFindings = parseResultFindings.length > 0 ? parseResultFindings : serverFindings;
  const hasCanonicalFindings = canonicalFindings.length > 0;
  const rawRuleGroups = state.parseResults?.ruleDetails as Array<{ cat: string; items: Array<RuleHitItem | [string, 'pass' | 'warn' | 'fail']> }> | undefined;
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
  const reviewItems = useMemo(() => rawReviewItems.map((item) => {
    const sourceFinding = item.findingId
      ? canonicalFindings.find((finding) => finding.finding_id === item.findingId)
      : undefined;
    const findingId = sourceFinding?.finding_id
      ?? item.findingId
      ?? toStableFindingId(`${canonicalDocumentId || 'demo-document'}:${item.id}`);
    return {
      ...item,
      id: findingId,
      findingId,
    };
  }), [canonicalDocumentId, canonicalFindings, rawReviewItems]);
  const allRules = useMemo(() => ruleGroups.flatMap((group) => group.items), [ruleGroups]);
  const focusFindingId = useReviewStore((reviewState) => reviewState.focusFindingId);
  const storeFindings = useReviewStore((reviewState) => reviewState.findings);
  const p1Exemption = useReviewStore((reviewState) => reviewState.p1Exemption);

  const maxDiffPage = Math.max(
    1,
    state.doc?.pages || 0,
    diffResult?.summary?.pages || 0,
    ...reviewItems.map((item) => item.page),
    ...Object.keys(hasFormatterFindingDiffs ? formatterDiffItems : pageDiffData).map(Number),
  );
  const pageList = useMemo(() => Array.from({ length: maxDiffPage }, (_, index) => index + 1), [maxDiffPage]);
  const paperPages = useMemo(
    () => buildPaperPages(pageList, parsedTexts, reviewItems, hasFormatterFindingDiffs ? formatterDiffItems : {}),
    [formatterDiffItems, hasFormatterFindingDiffs, pageList, parsedTexts, reviewItems],
  );

  const findings = useMemo<Finding[]>(() => reviewItems.map((item, index) => {
    const sourceFinding = item.findingId
      ? canonicalFindings.find((finding) => finding.finding_id === item.findingId)
      : undefined;
    const paperPage = paperPages.find((page) => page.pageNumber === item.page);
    const anchor = paperPage?.reviewAnchors.find((candidate) => candidate.findingId === item.findingId);
    const now = new Date().toISOString();
    const evidenceSpan = sourceFinding?.evidence_spans[0] ?? {
      page: item.page,
      char_start: 0,
      char_end: Math.max(item.current.length, 1),
      snippet: item.current,
      context_before: paperPage?.paragraphList[Math.max(0, (anchor?.paragraphIndex ?? 0) - 1)]?.slice(0, 50),
      context_after: paperPage?.paragraphList[(anchor?.paragraphIndex ?? 0) + 1]?.slice(0, 50),
    };
    const contractRuleId = sourceFinding?.rule_id ?? toContractRuleId(item.cat, item.label);
    const contractFindingId = sourceFinding?.finding_id ?? item.findingId ?? item.id;
    const sourceStatus = sourceFinding?.status === 'accepted' || sourceFinding?.status === 'rejected' || sourceFinding?.status === 'self_edited'
      ? sourceFinding.status
      : 'pending';
    return {
      finding_id: contractFindingId,
      document_id: sourceFinding?.document_id ?? canonicalDocumentId ?? 'demo-document',
      document_version: sourceFinding?.document_version ?? 1,
      pageNo: item.page,
      anchorRect: {
        x: 0,
        y: (anchor?.paragraphIndex ?? index) * 100,
        w: 100,
        h: 28,
      },
      ruleId: contractRuleId,
      rule_id: contractRuleId,
      rule_group: sourceFinding?.rule_group ?? item.cat,
      rule_snapshot: sourceFinding?.rule_snapshot ?? {
        rule_text: item.label,
        rule_version: school?.version || 'vAuto',
        rule_description: item.target,
      },
      ruleBreadcrumb: [
        school?.name ? `${school.name} vAuto` : '学校规则 vAuto',
        item.cat,
        item.label,
      ],
      problem: item.current,
      suggestionText: item.target,
      before: item.current,
      after: item.target,
      severity: sourceFinding?.severity ?? (item.status === 'fail' ? 'P0' : index === 0 ? 'P1' : 'P2'),
      confidence: sourceFinding?.confidence ?? (item.status === 'fail' ? 0.92 : index === 0 ? 0.82 : 0.68),
      evidence_spans: sourceFinding?.evidence_spans ?? [evidenceSpan],
      evidence_snapshot: sourceFinding?.evidence_snapshot ?? item.current,
      cross_page: sourceFinding?.cross_page ?? false,
      is_global: sourceFinding?.is_global ?? false,
      suggestion: sourceFinding?.suggestion ?? {
        type: 'replace',
        fix_diff: {
          before: item.current,
          after: item.target,
          spans_affected: [evidenceSpan],
        },
        explanation: item.target,
      },
      status: sourceStatus,
      created_at: sourceFinding?.created_at ?? now,
      updated_at: sourceFinding?.updated_at ?? now,
      audit_trail: sourceFinding?.audit_trail ?? [],
    };
  }), [canonicalDocumentId, canonicalFindings, paperPages, reviewItems, school]);

  const findingIdSet = useMemo(() => new Set(findings.map((finding) => finding.finding_id)), [findings]);
  const effectiveFindings = storeFindings.length === findings.length && storeFindings.every((finding) => findingIdSet.has(finding.finding_id))
    ? storeFindings
    : findings;
  const pendingFindings = effectiveFindings.filter((finding) => finding.status === 'pending');
  const p0PendingFindings = pendingFindings.filter((finding) => finding.severity === 'P0');
  const p1PendingFindings = pendingFindings.filter((finding) => finding.severity === 'P1');
  const p2PendingFindings = pendingFindings.filter((finding) => finding.severity === 'P2');
  const acceptedCount = effectiveFindings.filter((finding) => finding.status === 'accepted').length;
  const rejectedCount = effectiveFindings.filter((finding) => finding.status === 'rejected').length;
  const ignoredCount = rejectedCount;
  const processedCount = effectiveFindings.length - pendingFindings.length;
  const p1ExemptionCoversCurrent = !!p1Exemption
    && p1PendingFindings.length > 0
    && p1PendingFindings.every((finding) => p1Exemption.exempted_finding_ids.includes(finding.finding_id));
  const blockingPendingFindings = [
    ...p0PendingFindings,
    ...(p1ExemptionCoversCurrent ? [] : p1PendingFindings),
  ];
  const isDownloadAllowed = p0PendingFindings.length === 0 && (p1PendingFindings.length === 0 || p1ExemptionCoversCurrent);
  const shouldPersistFindings = !!legacyDocId && !!state.jobId && state.jobId !== 'demo' && !hasCanonicalFindings;
  const controller = useDiffReviewController({
    copy,
    pendingCount: pendingFindings.length,
    processedCount,
    reviewCount: effectiveFindings.length,
  });

  useEffect(() => {
    focusFindingIdRef.current = focusFindingId;
  }, [focusFindingId]);

  useEffect(() => {
    findingsRef.current = effectiveFindings;
  }, [effectiveFindings]);

  const effectivePassed = allRules.filter((rule) => rule.status === 'pass').length + acceptedCount;
  const paperTitle = state.doc?.name?.replace(/\.(docx|pdf)$/i, '') || '论文终稿';
  const paperHeader = school?.name ? `${school.name}本科毕业论文` : '本科毕业论文';
  const bannerState: 'pending' | 'all-accepted' | 'partial-rejected' = diffResult === null && !!state.jobId && state.jobId !== 'demo'
    ? 'pending'
    : controller.completionAnnounced && pendingFindings.length === 0 && effectiveFindings.length > 0
    ? 'all-accepted'
    : rejectedCount > 0
    ? 'partial-rejected'
    : 'pending';
  const bannerTitle = bannerState === 'all-accepted'
    ? copy.banner_done_title
    : bannerState === 'partial-rejected'
    ? t('banner_partial_title', { count: t('change_count', { count: pendingFindings.length }) })
    : copy.banner_pending_title;
  const bannerBody = bannerState === 'all-accepted'
    ? copy.banner_done_body
    : bannerState === 'partial-rejected'
    ? t('banner_partial_body', { count: t('change_count', { count: processedCount }) })
    : t('banner_pending_body', { count: t('change_count', { count: pendingFindings.length || effectiveFindings.length || 0 }) });
  const bannerCountText = bannerState === 'all-accepted' ? '✓' : String(pendingFindings.length || effectiveFindings.length || 0);
  const bannerLabel = bannerState === 'all-accepted' ? copy.banner_done_label : copy.banner_pending_label;
  const bannerIconGlyph = bannerState === 'all-accepted' ? '✦' : '✓';

  function buildDefaultExportFileName() {
    const base = state.doc?.name?.replace(/\.(docx|pdf)$/i, '') || '论文';
    const schoolShort = school ? `${school.name.replace(/大学$/, '')}${school.faculty?.replace(/学院$/, '') || ''}` : '';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${base}_${schoolShort}_${dateStr}.docx`;
  }

  function persistFindingDisposition(finding: Finding, action: 'accept' | 'reject' | 'self_edit') {
    if (!shouldPersistFindings) return;
    const request = action === 'accept'
      ? api.acceptFinding(finding.finding_id)
      : action === 'reject'
      ? api.rejectFinding(finding.finding_id)
      : api.selfEditFinding(finding, finding.after);
    void request.catch(() => {
      showToast('发现项审计同步暂时失败，本地确认状态已保留。');
    });
  }

  function openExport() {
    if (p0PendingFindings.length > 0) {
      showToast(`还有 ${p0PendingFindings.length} 项 P0 发现必须处理，P0 不能豁免。`);
      return;
    }
    if (p1PendingFindings.length > 0 && !p1ExemptionCoversCurrent) {
      setShowExemptionConfirm(true);
      return;
    }
    setExportFileName(buildDefaultExportFileName());
    setShowExportConfirm(true);
  }

  useEffect(() => {
    if (!state.jobId || state.jobId === 'demo' || diffResult) return;
    api.getDiff(state.jobId)
      .then(setDiffResult)
      .catch(() => {
        showToast('批改结果加载出了点问题，请稍后重试。');
      });
  }, [diffResult, showToast, state.jobId]);

  useEffect(() => {
    reviewActions.initializeHashSync();
  }, []);

  useEffect(() => {
    if (!canonicalDocumentId || !state.jobId || state.jobId === 'demo' || parseResultFindings.length > 0) return;
    let cancelled = false;
    api.listFindings({ canonicalDocumentId, jobId: state.jobId })
      .then((items) => {
        if (!cancelled) setServerFindings(items);
      })
      .catch(() => {
        showToast('发现项读取暂时失败，将使用本地解析结果继续确认。');
      });
    return () => {
      cancelled = true;
    };
  }, [canonicalDocumentId, parseResultFindings.length, showToast, state.jobId]);

  useEffect(() => {
    reviewActions.hydrateFindings(findings);
  }, [findings]);

  useEffect(() => {
    const documentId = canonicalDocumentId;
    if (!shouldPersistFindings || !documentId) return;
    void api.syncFindings({
      jobId: state.jobId || undefined,
      canonicalDocumentId: documentId,
      findings,
    }).catch(() => {
      showToast('发现项审计同步暂时失败，本地确认状态已保留。');
    });
  }, [canonicalDocumentId, findings, shouldPersistFindings, showToast, state.jobId]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const isMetaEnter = (event.metaKey || event.ctrlKey) && event.key === 'Enter';
      const isMetaSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';

      if (isMetaEnter && pendingFindings.length > 0) {
        event.preventDefault();
        controller.setShowAcceptAllConfirm(true);
        return;
      }

      if (isMetaSave && isDownloadAllowed) {
        event.preventDefault();
        openExport();
        return;
      }

      const latestFocusFindingId = focusFindingIdRef.current;
      const latestFindings = findingsRef.current;
      const activeFinding = latestFindings.find((finding) => finding.finding_id === latestFocusFindingId) || latestFindings[0];
      if (!activeFinding) return;
      const activeIndex = latestFindings.findIndex((finding) => finding.finding_id === activeFinding.finding_id);
      const nextPending = latestFindings
        .slice(activeIndex + 1)
        .concat(latestFindings.slice(0, Math.max(0, activeIndex)))
        .find((candidate) => candidate.finding_id !== activeFinding.finding_id && candidate.status === 'pending');

      if (event.key === 'Enter') {
        event.preventDefault();
        reviewActions.setFindingStatus(activeFinding.finding_id, 'accepted');
        persistFindingDisposition(activeFinding, 'accept');
        if (nextPending) window.setTimeout(() => reviewActions.setFocus(nextPending.finding_id, 'pane'), 500);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        reviewActions.setFindingStatus(activeFinding.finding_id, 'rejected');
        persistFindingDisposition(activeFinding, 'reject');
        if (nextPending) window.setTimeout(() => reviewActions.setFocus(nextPending.finding_id, 'pane'), 500);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextFinding = latestFindings[Math.min(latestFindings.length - 1, activeIndex + 1)];
        if (nextFinding) {
          reviewActions.setFocus(nextFinding.finding_id, 'pane');
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prevFinding = latestFindings[Math.max(0, activeIndex - 1)];
        if (prevFinding) {
          reviewActions.setFocus(prevFinding.finding_id, 'pane');
        }
        return;
      }

      if (event.key === 'PageDown') {
        event.preventDefault();
        const targetFinding = latestFindings[Math.min(latestFindings.length - 1, activeIndex + 1)];
        if (targetFinding) reviewActions.setFocus(targetFinding.finding_id, 'pane');
        return;
      }

      if (event.key === 'PageUp') {
        event.preventDefault();
        const targetFinding = latestFindings[Math.max(0, activeIndex - 1)];
        if (targetFinding) reviewActions.setFocus(targetFinding.finding_id, 'pane');
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [controller, isDownloadAllowed, openExport, pendingFindings.length, persistFindingDisposition]);

  const doExport = async () => {
    set({ exporting: true });
    try {
      if (state.jobId && state.jobId !== 'demo') {
        const formatJob = await api.createFormatJob({
          legacyDocId: legacyDocId || undefined,
          jobId: state.jobId,
          profileId: state.schoolId || 'default',
        });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        set({ exporting: false, exported: true, step: 6, jobId: formatJob.jobId });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900));
        set({ exporting: false, exported: true, step: 6 });
      }
      showToast(copy.export_started);
    } catch (err: unknown) {
      set({ exporting: false });
      const message = err instanceof Error ? err.message : '未知错误';
      showToast(t('export_failed', { message }));
    }
  };

  const confirmP1Exemption = () => {
    const reason = exemptionReason.trim();
    if (reason.length < 20) {
      showToast('请填写不少于 20 个字的 P1 豁免理由。');
      return;
    }
    if (!exemptionRiskAccepted) {
      showToast('请勾选“我承担未处理风险”后继续。');
      return;
    }
    const p1FindingIds = p1PendingFindings.map((finding) => finding.finding_id);
    reviewActions.recordP1Exemption(p1FindingIds, reason);
    if (shouldPersistFindings && canonicalDocumentId) {
      void api.exemptP1Findings({
        document_id: canonicalDocumentId,
        actor_id: 'local-author',
        actor_role: 'Author',
        exempted_finding_ids: p1PendingFindings.map((finding) => finding.finding_id),
        reason,
        acknowledged: true,
      }).catch(() => {
        showToast('P1 豁免审计同步暂时失败，本地豁免状态已保留。');
      });
    }
    setShowExemptionConfirm(false);
    setExemptionReason('');
    setExemptionRiskAccepted(false);
    setExportFileName(buildDefaultExportFileName());
    setShowExportConfirm(true);
  };

  return (
    <>
      {controller.showAcceptAllConfirm ? (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21,23,27,.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: 24,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--paper)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-modal)',
              padding: '28px 28px 24px',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-xl)',
                fontFamily: 'var(--font-serif)',
                color: 'var(--ink-text)',
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {t('accept_all_confirm_title', { count: t('change_count', { count: pendingFindings.length }) })}
            </div>
            <div
              style={{
                fontSize: 'var(--text-md)',
                color: 'var(--ink-secondary)',
                lineHeight: 'var(--leading-normal)',
                marginBottom: 24,
              }}
            >
              {copy.accept_all_confirm_body}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <Btn kind="ghost" size="md" onClick={() => controller.setShowAcceptAllConfirm(false)}>
                {copy.cancel}
              </Btn>
              <Btn
                kind="brand"
                size="md"
                onClick={() => {
                  controller.setShowAcceptAllConfirm(false);
                  pendingFindings.forEach((finding) => {
                    reviewActions.setFindingStatus(finding.finding_id, 'accepted');
                    persistFindingDisposition(finding, 'accept');
                  });
                }}
              >
                {copy.accept_all_confirm_action}
              </Btn>
            </div>
          </div>
        </div>
      ) : showExemptionConfirm ? (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21,23,27,.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: 24,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: 'var(--paper)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-modal)',
              padding: '28px 28px 24px',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-xl)',
                fontFamily: 'var(--font-serif)',
                color: 'var(--ink-text)',
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              仍有 {p1PendingFindings.length} 项 P1 发现未处理，是否签字豁免？
            </div>
            <div
              style={{
                fontSize: 'var(--text-md)',
                color: 'var(--ink-secondary)',
                lineHeight: 'var(--leading-normal)',
                marginBottom: 16,
              }}
            >
              P1 默认会阻塞下载。你可以作为作者签字豁免，但系统会把理由写入审计记录；P0 发现仍然不能豁免。
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {p1PendingFindings.slice(0, 4).map((finding) => (
                <div key={finding.finding_id} style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-text)' }}>
                  <strong>{finding.ruleBreadcrumb.at(-1)}</strong>
                  <span style={{ color: 'var(--ink-secondary)' }}> · 第 {finding.pageNo} 页 · {finding.problem}</span>
                </div>
              ))}
            </div>
            <textarea
              value={exemptionReason}
              onChange={(event) => setExemptionReason(event.target.value)}
              placeholder="请写明为什么允许这些 P1 发现暂不处理，至少 20 个字"
              style={{
                width: '100%',
                minHeight: 92,
                resize: 'vertical',
                border: '1px solid var(--rule-line)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                fontSize: 'var(--text-sm)',
                color: 'var(--ink-text)',
                background: '#fff',
                marginBottom: 12,
              }}
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 22 }}>
              <input
                type="checkbox"
                checked={exemptionRiskAccepted}
                onChange={(event) => setExemptionRiskAccepted(event.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>我承担未处理 P1 发现带来的交稿风险，并同意写入审计记录。</span>
            </label>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <Btn kind="ghost" size="md" onClick={() => setShowExemptionConfirm(false)}>
                {copy.cancel}
              </Btn>
              <Btn kind="brand" size="md" onClick={confirmP1Exemption}>
                签字豁免并继续下载
              </Btn>
            </div>
          </div>
        </div>
      ) : showExportConfirm ? (
        <ExportConfirmDialog
          effectivePassed={effectivePassed}
          acceptedCount={acceptedCount}
          ignoredCount={ignoredCount}
          exportFileName={exportFileName}
          exportFileNameEditing={exportFileNameEditing}
          onFileNameChange={setExportFileName}
          onFileNameEditToggle={() => setExportFileNameEditing((value) => !value)}
          onCancel={() => setShowExportConfirm(false)}
          onConfirm={() => {
            setShowExportConfirm(false);
            void doExport();
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            flex: 1,
            background: 'var(--bg-canvas)',
          }}
        >
          <section
            style={{
              minHeight: 144,
              padding: '24px 32px 20px',
              background: 'linear-gradient(135deg, #f4f8f5 0%, #e8f0eb 100%)',
              borderBottom: '1px solid var(--rule-line)',
              display: 'flex',
              alignItems: 'center',
              opacity: controller.bannerVisible ? 1 : 0,
              transform: controller.bannerVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 400ms var(--ease-standard), transform 400ms var(--ease-standard)',
              animation: bannerState === 'all-accepted' ? 'diffBannerComplete 600ms var(--ease-standard)' : 'none',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '999px',
                background: 'var(--ink-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'var(--shadow-card)',
                marginRight: 20,
                flexShrink: 0,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {bannerIconGlyph}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                aria-live="polite"
                aria-atomic="true"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'var(--text-3xl)',
                  lineHeight: 'var(--leading-tight)',
                  color: 'var(--ink-primary)',
                  fontWeight: 600,
                  marginBottom: 10,
                  letterSpacing: '0.02em',
                }}
              >
                {bannerTitle}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-md)',
                  lineHeight: 'var(--leading-normal)',
                  color: 'var(--ink-secondary)',
                  maxWidth: 760,
                  marginTop: 8,
                }}
              >
                {bannerBody}
              </div>
            </div>
            <div
              style={{
                flexShrink: 0,
                minWidth: 112,
                padding: '10px 0 10px 18px',
                textAlign: 'center',
              }}
            >
              <div
                data-testid="diff-banner-count"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 48,
                  lineHeight: 1,
                  color: 'var(--ink-primary)',
                  fontWeight: 700,
                }}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span
                  key={bannerCountText}
                  style={{
                    display: 'inline-block',
                    animation: 'diffBadgeFlip 360ms var(--ease-standard)',
                  }}
                >
                  {bannerCountText}
                </span>
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  marginTop: 6,
                  color: 'var(--ink-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {bannerLabel}
              </div>
            </div>
          </section>

          <section
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: '280px minmax(0, 1fr) 400px',
              gap: 0,
              overflow: 'hidden',
            }}
          >
            <RulePane
              findings={effectiveFindings}
              onMissingFinding={showToast}
            />

            <Canvas
              pages={paperPages}
              findings={effectiveFindings}
              paperBow={controller.paperBow}
              isAllAccepted={controller.isAllAccepted}
              paperHeader={paperHeader}
              paperTitle={paperTitle}
              copy={copy}
            />

            <FindingPane
              copy={copy}
              findings={effectiveFindings}
              onAccept={(finding) => {
                const currentIndex = effectiveFindings.findIndex((candidate) => candidate.finding_id === finding.finding_id);
                const nextPending = effectiveFindings
                  .slice(currentIndex + 1)
                  .concat(effectiveFindings.slice(0, Math.max(0, currentIndex)))
                  .find((candidate) => candidate.finding_id !== finding.finding_id && candidate.status === 'pending');
                reviewActions.setFindingStatus(finding.finding_id, 'accepted');
                persistFindingDisposition(finding, 'accept');
                if (nextPending) {
                  window.setTimeout(() => reviewActions.setFocus(nextPending.finding_id, 'pane'), 500);
                }
              }}
              onReject={(finding) => {
                const currentIndex = effectiveFindings.findIndex((candidate) => candidate.finding_id === finding.finding_id);
                const nextPending = effectiveFindings
                  .slice(currentIndex + 1)
                  .concat(effectiveFindings.slice(0, Math.max(0, currentIndex)))
                  .find((candidate) => candidate.finding_id !== finding.finding_id && candidate.status === 'pending');
                reviewActions.setFindingStatus(finding.finding_id, 'rejected');
                persistFindingDisposition(finding, 'reject');
                if (nextPending) {
                  window.setTimeout(() => reviewActions.setFocus(nextPending.finding_id, 'pane'), 500);
                }
              }}
              onSelfEdit={(finding) => {
                reviewActions.setFocus(finding.finding_id, 'pane');
              }}
            />
          </section>

          <footer
            style={{
              minHeight: 72,
              borderTop: '1px solid var(--rule-line)',
              background: 'rgba(253,252,250,.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
              position: 'sticky',
              bottom: 0,
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              zIndex: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minWidth: 0,
              }}
            >
              <span className={`diff-footer-status-dot${isDownloadAllowed ? ' is-complete' : ' is-pending'}`} />
              <span
                data-testid="diff-footer-status"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: isDownloadAllowed ? 'var(--accepted-green)' : 'var(--ink-secondary)',
                }}
              >
                已处置 {processedCount}/{effectiveFindings.length} 项 · P0 剩 {p0PendingFindings.length} / P1 剩 {p1ExemptionCoversCurrent ? 0 : p1PendingFindings.length} / P2 剩 {p2PendingFindings.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {pendingFindings.length > 0 && (
                <Btn
                  kind="ghost"
                  size="md"
                  onClick={() => controller.setShowAcceptAllConfirm(true)}
                  style={{
                    color: 'var(--ink-primary)',
                    borderColor: 'var(--ink-primary)',
                    background: 'transparent',
                  }}
                >
                  {t('footer_accept_all', { count: t('change_count', { count: pendingFindings.length }) })}
                </Btn>
              )}
              <Btn
                kind={isDownloadAllowed ? 'brand' : 'ghost'}
                size="md"
                icon="download"
                onClick={openExport}
                style={{
                  background: isDownloadAllowed ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                  borderColor: isDownloadAllowed ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                  color: '#fff',
                  animation: controller.downloadReadyPulse ? 'diffBannerComplete 600ms var(--ease-standard)' : 'none',
                }}
                title={!isDownloadAllowed ? `还有 ${blockingPendingFindings.length} 项 P0/P1 发现需要处理或豁免` : undefined}
              >
                {copy.footer_download}
              </Btn>
            </div>
          </footer>
        </div>
      )}

      {state.exporting && <ExportOverlay />}
    </>
  );
};

export default Step4Diff;
