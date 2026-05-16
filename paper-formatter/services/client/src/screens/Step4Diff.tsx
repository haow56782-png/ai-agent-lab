import React, { useEffect, useMemo } from 'react';
import { useApp, findSchoolById, getCanonicalDocumentId, getLegacyDocumentId } from '../components/AppFrame';
import type { RuleHitItem } from '../api/client';
import { api } from '../api/client';
import { ExportOverlay } from '../components/ExportOverlay';
import { useUndoWindow } from '../hooks/useUndoWindow';
import { reviewActions, useReviewStore, type Finding } from '../stores/reviewStore';
import { createDiffTranslator } from './step4-diff/diffCopy';
import { Step4DiffBanner } from './step4-diff/Step4DiffBanner';
import { Step4DiffFooter } from './step4-diff/Step4DiffFooter';
import { Step4DiffModals } from './step4-diff/Step4DiffModals';
import { Step4DiffWorkbench } from './step4-diff/Step4DiffWorkbench';
import { useStep4DiffDataSource } from './step4-diff/useStep4DiffDataSource';
import { useStep4DownloadController } from './step4-diff/useStep4DownloadController';
import { useDiffReviewController } from './step4-diff/useDiffReviewController';
import { useStep4FindingViewModel } from './step4-diff/useStep4FindingViewModel';
import { useStep4KeyboardInteractions } from './step4-diff/useStep4KeyboardInteractions';
import { DiffStatusBar } from '../components/DiffStatusBar';
import { getContentIntegrityView } from '../utils/contentIntegrityView';

interface Props {
  showToast: (msg: string) => void;
}

const Step4Diff: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const { copy, t } = createDiffTranslator('zh-CN');

  const school = findSchoolById(state.schoolId);
  const analyzeJobId = state.analyzeJobId;
  const formatJobId = state.formatJobId;
  const parsedTexts = useMemo(() => state.parseResults?.parsedTexts ?? [], [state.parseResults?.parsedTexts]);
  const legacyDocId = getLegacyDocumentId(state);
  const canonicalDocumentId = getCanonicalDocumentId(state);
  const parseResultFindings = state.parseResults?.findings ?? [];
  const { diffResult, serverFindings } = useStep4DiffDataSource({
    analyzeJobId,
    formatJobId,
    canonicalDocumentId,
    parseResultFindingCount: parseResultFindings.length,
    showToast,
  });
  const rawRuleGroups = state.parseResults?.ruleDetails as Array<{ cat: string; items: Array<RuleHitItem | [string, 'pass' | 'warn' | 'fail']> }> | undefined;
  const focusFindingId = useReviewStore((reviewState) => reviewState.focusFindingId);
  const p1Exemption = useReviewStore((reviewState) => reviewState.p1Exemption);
  const {
    allRules,
    effectiveFindings,
    findingsHydrationKey,
    hasCanonicalFindings,
    paperPages,
    stableHydrationFindings,
  } = useStep4FindingViewModel({
    canonicalDocumentId,
    documentPageCount: state.doc?.pages || 0,
    diffResult,
    parseResultFindings,
    parsedTexts,
    rawRuleGroups,
    school,
    serverFindings,
  });
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
  const shouldPersistFindings = !!legacyDocId && !!analyzeJobId && analyzeJobId !== 'demo' && !hasCanonicalFindings;
  const controller = useDiffReviewController({
    copy,
    pendingCount: pendingFindings.length,
    processedCount,
    reviewCount: effectiveFindings.length,
  });
  const downloadController = useStep4DownloadController({
    analyzeJobId,
    canonicalDocumentId,
    legacyDocId,
    schoolId: state.schoolId,
    school,
    documentName: state.doc?.name,
    p0PendingFindings,
    p1PendingFindings,
    p1ExemptionCoversCurrent,
    shouldPersistFindings,
    showToast,
    setAppState: set,
    exportStartedMessage: copy.export_started,
    formatExportFailedMessage: (message) => t('export_failed', { message }),
  });

  const effectivePassed = allRules.filter((rule) => rule.status === 'pass').length + acceptedCount;
  const contentIntegrityView = useMemo(
    () => getContentIntegrityView(diffResult?.integrity),
    [diffResult?.integrity],
  );
  const paperTitle = state.doc?.name?.replace(/\.(docx|pdf)$/i, '') || '论文终稿';
  const paperHeader = school?.name ? `${school.name}本科毕业论文` : '本科毕业论文';
  const bannerState: 'pending' | 'all-accepted' | 'partial-rejected' = diffResult === null && !!formatJobId && formatJobId !== 'demo'
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
  const acceptAllFooterLabel = t('footer_accept_all', { count: t('change_count', { count: pendingFindings.length }) });
  const p1BlockingCount = p1ExemptionCoversCurrent ? 0 : p1PendingFindings.length;
  const undo = useUndoWindow();

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

  function findNextPendingFinding(currentFinding: Finding) {
    const currentIndex = effectiveFindings.findIndex((candidate) => candidate.finding_id === currentFinding.finding_id);
    return effectiveFindings
      .slice(currentIndex + 1)
      .concat(effectiveFindings.slice(0, Math.max(0, currentIndex)))
      .find((candidate) => candidate.finding_id !== currentFinding.finding_id && candidate.status === 'pending');
  }

  function acceptFinding(finding: Finding) {
    const nextPending = findNextPendingFinding(finding);
    reviewActions.setFindingStatus(finding.finding_id, 'accepted');
    persistFindingDisposition(finding, 'accept');
    if (nextPending) window.setTimeout(() => reviewActions.setFocus(nextPending.finding_id, 'pane'), 500);
  }

  function rejectFinding(finding: Finding) {
    const nextPending = findNextPendingFinding(finding);
    reviewActions.setFindingStatus(finding.finding_id, 'rejected');
    persistFindingDisposition(finding, 'reject');
    if (nextPending) window.setTimeout(() => reviewActions.setFocus(nextPending.finding_id, 'pane'), 500);
  }

  function acceptAllPendingFindings() {
    controller.setShowAcceptAllConfirm(false);
    const previousStatuses: Record<string, string> = {};
    pendingFindings.forEach((finding) => {
      previousStatuses[finding.finding_id] = finding.status;
      reviewActions.setFindingStatus(finding.finding_id, 'accepted');
      persistFindingDisposition(finding, 'accept');
    });
    undo.registerBatchUndo(
      pendingFindings.map((f) => f.finding_id),
      previousStatuses,
    );
  }

  function undoBatchAccept() {
    undo.batchIds.forEach((findingId) => {
      const prevStatus = undo.batchPreviousStatuses[findingId];
      reviewActions.setFindingStatus(findingId, (prevStatus as any) === 'accepted' ? 'pending' : prevStatus as any);
    });
    undo.dismissBatchUndo();
  }

  useEffect(() => {
    reviewActions.initializeHashSync();
  }, []);

  useEffect(() => {
    reviewActions.hydrateFindings(stableHydrationFindings);
  }, [findingsHydrationKey, stableHydrationFindings]);

  useEffect(() => {
    const documentId = canonicalDocumentId;
    if (!shouldPersistFindings || !documentId) return;
    void api.syncFindings({
      analyzeJobId: analyzeJobId || undefined,
      canonicalDocumentId: documentId,
      findings: stableHydrationFindings,
    }).catch(() => {
      showToast('发现项审计同步暂时失败，本地确认状态已保留。');
    });
  }, [analyzeJobId, canonicalDocumentId, findingsHydrationKey, shouldPersistFindings, showToast, stableHydrationFindings]);

  useStep4KeyboardInteractions({
    focusFindingId,
    findings: effectiveFindings,
    pendingCount: pendingFindings.length,
    isDownloadAllowed,
    onAcceptFinding: acceptFinding,
    onRejectFinding: rejectFinding,
    onFocusFinding: (findingId) => reviewActions.setFocus(findingId, 'pane'),
    onOpenAcceptAllConfirm: () => controller.setShowAcceptAllConfirm(true),
    onOpenExport: downloadController.openExport,
  });

  return (
    <>
      {controller.showAcceptAllConfirm || downloadController.showExemptionConfirm || downloadController.showExportConfirm ? (
          <Step4DiffModals
            acceptedCount={acceptedCount}
            contentIntegrity={contentIntegrityView}
            copy={copy}
          downloadController={downloadController}
          effectivePassed={effectivePassed}
          ignoredCount={ignoredCount}
          pendingFindings={pendingFindings}
          p1PendingFindings={p1PendingFindings}
          showAcceptAllConfirm={controller.showAcceptAllConfirm}
          showExemptionConfirm={downloadController.showExemptionConfirm}
          showExportConfirm={downloadController.showExportConfirm}
          t={t}
          onAcceptAll={acceptAllPendingFindings}
          onCloseAcceptAll={() => controller.setShowAcceptAllConfirm(false)}
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
          <Step4DiffBanner
            body={bannerBody}
            contentIntegrity={contentIntegrityView}
            countText={bannerCountText}
            iconGlyph={bannerIconGlyph}
            isComplete={bannerState === 'all-accepted'}
            label={bannerLabel}
            title={bannerTitle}
            visible={controller.bannerVisible}
          />

          <DiffStatusBar
            total={effectiveFindings.length}
            pendingCount={pendingFindings.length}
            acceptedCount={acceptedCount}
            rejectedCount={rejectedCount}
            passedCount={effectivePassed}
            failCount={0}
          />

          <Step4DiffWorkbench
            copy={copy}
            findings={effectiveFindings}
            isAllAccepted={controller.isAllAccepted}
            onAccept={acceptFinding}
            onMissingFinding={showToast}
            onReject={rejectFinding}
            onSelfEdit={(finding) => reviewActions.setFocus(finding.finding_id, 'pane')}
            paperBow={controller.paperBow}
            paperHeader={paperHeader}
            paperPages={paperPages}
            paperTitle={paperTitle}
          />

          <Step4DiffFooter
            acceptAllLabel={acceptAllFooterLabel}
            blockingPendingCount={blockingPendingFindings.length}
            completedFindingCount={processedCount}
            downloadLabel={copy.footer_download}
            downloadReadyPulse={controller.downloadReadyPulse}
            isDownloadAllowed={isDownloadAllowed}
            onAcceptAll={() => controller.setShowAcceptAllConfirm(true)}
            onDownload={downloadController.openExport}
            p0PendingCount={p0PendingFindings.length}
            p1PendingCount={p1BlockingCount}
            p2PendingCount={p2PendingFindings.length}
            pendingCount={pendingFindings.length}
            totalFindingCount={effectiveFindings.length}
          />

          {/* Global batch undo bar */}
          {undo.hasBatchUndo && (
            <div style={{
              position: 'fixed',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 20px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100,
              fontSize: 13,
              color: 'var(--text-primary)',
              animation: 'slideUp 200ms ease-out',
            }}>
              <span>已接受 {undo.batchIds.length} 项修改</span>
              <button
                type="button"
                onClick={undoBatchAccept}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--brand)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 8px',
                }}
              >
                全部撤销
              </button>
              <div style={{
                width: 80,
                height: 3,
                background: 'var(--border-light)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(undo.batchDisplayMs / 10000) * 100}%`,
                  height: '100%',
                  background: 'var(--brand)',
                  borderRadius: 2,
                  transition: 'width 200ms linear',
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 28, textAlign: 'right' }}>
                {Math.ceil(undo.batchDisplayMs / 1000)}s
              </span>
            </div>
          )}
        </div>
      )}

      {state.exporting && <ExportOverlay />}
    </>
  );
};

export default Step4Diff;
