import { useEffect, useRef, useState } from 'react';
import type { DiffCopyShape } from './diffCopy';

interface Params {
  copy: DiffCopyShape;
  pendingCount: number;
  processedCount: number;
  reviewCount: number;
}

export function useDiffReviewController({
  copy,
  pendingCount,
  processedCount,
  reviewCount,
}: Params) {
  const lastAllAcceptedRef = useRef(false);
  const secondPulseTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  const [bannerVisible, setBannerVisible] = useState(false);
  const [downloadReadyPulse, setDownloadReadyPulse] = useState(false);
  const [paperBow, setPaperBow] = useState(false);
  const [userInteractedAfterComplete, setUserInteractedAfterComplete] = useState(false);
  const [completionAnnounced, setCompletionAnnounced] = useState(false);
  const [showAcceptAllConfirm, setShowAcceptAllConfirm] = useState(false);

  const isAllAccepted = reviewCount > 0 && pendingCount === 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setBannerVisible(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (secondPulseTimerRef.current !== null) window.clearTimeout(secondPulseTimerRef.current);
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isAllAccepted) {
      const resetTimer = window.setTimeout(() => {
        setDownloadReadyPulse(false);
        setPaperBow(false);
        setCompletionAnnounced(false);
        lastAllAcceptedRef.current = false;
      }, 0);
      if (secondPulseTimerRef.current !== null) window.clearTimeout(secondPulseTimerRef.current);
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
      return () => window.clearTimeout(resetTimer);
    }
    if (lastAllAcceptedRef.current) return;
    lastAllAcceptedRef.current = true;
    setUserInteractedAfterComplete(false);
    settleTimerRef.current = window.setTimeout(() => {
      setCompletionAnnounced(true);
      setPaperBow(true);
      setDownloadReadyPulse(true);
      window.setTimeout(() => setDownloadReadyPulse(false), 600);
      secondPulseTimerRef.current = window.setTimeout(() => {
        if (!userInteractedAfterComplete) {
          setDownloadReadyPulse(true);
          window.setTimeout(() => setDownloadReadyPulse(false), 600);
        }
      }, 1500);
    }, 800);
  }, [isAllAccepted, userInteractedAfterComplete]);

  useEffect(() => {
    if (!isAllAccepted) return;
    const markInteraction = () => setUserInteractedAfterComplete(true);
    window.addEventListener('pointerdown', markInteraction);
    window.addEventListener('keydown', markInteraction);
    return () => {
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, [isAllAccepted]);

  useEffect(() => {
    const shouldWarn = pendingCount > 0 && processedCount > 0;
    if (!shouldWarn) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = copy.beforeunload_warning;
      return event.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [copy.beforeunload_warning, pendingCount, processedCount]);

  return {
    bannerVisible,
    downloadReadyPulse,
    paperBow,
    completionAnnounced,
    showAcceptAllConfirm,
    setShowAcceptAllConfirm,
    processedCount,
    isAllAccepted,
    setUserInteractedAfterComplete,
  };
}
