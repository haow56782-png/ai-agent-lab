import { useState } from 'react';
import { api } from '../../api/client';
import type { AppState, SchoolOption } from '../../components/AppFrame';
import { reviewActions, type Finding } from '../../stores/reviewStore';

interface Step4DownloadControllerInput {
  analyzeJobId: string | null;
  canonicalDocumentId: string | null;
  legacyDocId: string | null;
  schoolId: string | null;
  school: SchoolOption | null;
  documentName: string | undefined;
  p0PendingFindings: Finding[];
  p1PendingFindings: Finding[];
  p1ExemptionCoversCurrent: boolean;
  shouldPersistFindings: boolean;
  showToast: (message: string) => void;
  setAppState: (patch: Partial<AppState>) => void;
  exportStartedMessage: string;
  formatExportFailedMessage: (message: string) => string;
}

export function useStep4DownloadController({
  analyzeJobId,
  canonicalDocumentId,
  legacyDocId,
  schoolId,
  school,
  documentName,
  p0PendingFindings,
  p1PendingFindings,
  p1ExemptionCoversCurrent,
  shouldPersistFindings,
  showToast,
  setAppState,
  exportStartedMessage,
  formatExportFailedMessage,
}: Step4DownloadControllerInput) {
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showExemptionConfirm, setShowExemptionConfirm] = useState(false);
  const [exemptionReason, setExemptionReason] = useState('');
  const [exemptionRiskAccepted, setExemptionRiskAccepted] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [exportFileNameEditing, setExportFileNameEditing] = useState(false);

  function buildDefaultExportFileName() {
    const base = documentName?.replace(/\.(docx|pdf)$/i, '') || '论文';
    const schoolShort = school ? `${school.name.replace(/大学$/, '')}${school.faculty?.replace(/学院$/, '') || ''}` : '';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${base}_${schoolShort}_${dateStr}.docx`;
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

  async function confirmExport() {
    setAppState({ exporting: true });
    try {
      if (analyzeJobId && analyzeJobId !== 'demo') {
        const formatJob = await api.createFormatJob({
          legacyDocId: legacyDocId || undefined,
          analyzeJobId,
          profileId: schoolId || 'default',
        });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setAppState({
          exporting: false,
          exported: true,
          step: 6,
          formatJobId: formatJob.jobId,
          jobStatus: formatJob.status,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900));
        setAppState({ exporting: false, exported: true, step: 6 });
      }
      showToast(exportStartedMessage);
    } catch (error: unknown) {
      setAppState({ exporting: false });
      const message = error instanceof Error ? error.message : '未知错误';
      showToast(formatExportFailedMessage(message));
    }
  }

  function confirmP1Exemption() {
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
        exempted_finding_ids: p1FindingIds,
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
  }

  return {
    confirmExport,
    confirmP1Exemption,
    exemptionReason,
    exemptionRiskAccepted,
    exportFileName,
    exportFileNameEditing,
    openExport,
    setExemptionReason,
    setExemptionRiskAccepted,
    setExportFileName,
    setExportFileNameEditing,
    setShowExemptionConfirm,
    setShowExportConfirm,
    showExemptionConfirm,
    showExportConfirm,
  };
}
