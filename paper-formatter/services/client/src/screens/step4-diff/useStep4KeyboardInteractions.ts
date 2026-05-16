import { useEffect, useRef } from 'react';
import type { Finding } from '../../stores/reviewStore';

interface Step4KeyboardInteractionsInput {
  focusFindingId: string | null;
  findings: Finding[];
  pendingCount: number;
  isDownloadAllowed: boolean;
  onAcceptFinding: (finding: Finding) => void;
  onRejectFinding: (finding: Finding) => void;
  onFocusFinding: (findingId: string) => void;
  onOpenAcceptAllConfirm: () => void;
  onOpenExport: () => void;
}

export function useStep4KeyboardInteractions({
  focusFindingId,
  findings,
  pendingCount,
  isDownloadAllowed,
  onAcceptFinding,
  onRejectFinding,
  onFocusFinding,
  onOpenAcceptAllConfirm,
  onOpenExport,
}: Step4KeyboardInteractionsInput) {
  const runtimeRef = useRef({
    focusFindingId,
    findings,
    pendingCount,
    isDownloadAllowed,
    onAcceptFinding,
    onRejectFinding,
    onFocusFinding,
    onOpenAcceptAllConfirm,
    onOpenExport,
  });

  useEffect(() => {
    runtimeRef.current = {
      focusFindingId,
      findings,
      pendingCount,
      isDownloadAllowed,
      onAcceptFinding,
      onRejectFinding,
      onFocusFinding,
      onOpenAcceptAllConfirm,
      onOpenExport,
    };
  }, [
    findings,
    focusFindingId,
    isDownloadAllowed,
    onAcceptFinding,
    onFocusFinding,
    onOpenAcceptAllConfirm,
    onOpenExport,
    onRejectFinding,
    pendingCount,
  ]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const {
        focusFindingId: latestFocusFindingId,
        findings: latestFindings,
        pendingCount: latestPendingCount,
        isDownloadAllowed: latestDownloadAllowed,
        onAcceptFinding: acceptFinding,
        onRejectFinding: rejectFinding,
        onFocusFinding: focusFinding,
        onOpenAcceptAllConfirm: openAcceptAllConfirm,
        onOpenExport: openExport,
      } = runtimeRef.current;

      const isMetaEnter = (event.metaKey || event.ctrlKey) && event.key === 'Enter';
      const isMetaSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';

      if (isMetaEnter && latestPendingCount > 0) {
        event.preventDefault();
        openAcceptAllConfirm();
        return;
      }

      if (isMetaSave && latestDownloadAllowed) {
        event.preventDefault();
        openExport();
        return;
      }

      const activeFinding = latestFindings.find((finding) => finding.finding_id === latestFocusFindingId) || latestFindings[0];
      if (!activeFinding) return;
      const activeIndex = latestFindings.findIndex((finding) => finding.finding_id === activeFinding.finding_id);

      if (event.key === 'Enter') {
        event.preventDefault();
        acceptFinding(activeFinding);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        rejectFinding(activeFinding);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        const nextFinding = latestFindings[Math.min(latestFindings.length - 1, activeIndex + 1)];
        if (nextFinding) focusFinding(nextFinding.finding_id);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        const previousFinding = latestFindings[Math.max(0, activeIndex - 1)];
        if (previousFinding) focusFinding(previousFinding.finding_id);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);
}
