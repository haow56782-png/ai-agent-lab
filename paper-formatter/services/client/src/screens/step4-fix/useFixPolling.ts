import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { api } from '../../api/client';
import type { FixJobArtifact, FixJobEvent, FixStatusResponse, FixType } from '../../api/client';
import { getLegacyDocumentId, type AppState } from '../../components/AppFrame';
import { BROWSE_MODE_FIX_HINT, LEGACY_DOC_HINT } from './constants';
import type { FixStep } from './types';

interface Params {
  state: AppState;
  fixJobId: string | null;
  setAppState: (patch: Partial<AppState>) => void;
  showToast: (msg: string) => void;
  canLaunchRealFix: boolean;
  unsupportedLegacyDoc: boolean;
  paid: boolean;
  doneCount: number;
  freeFixLimit: number;
  steps: FixStep[];
  setSteps: Dispatch<SetStateAction<FixStep[]>>;
  setFixing: Dispatch<SetStateAction<boolean>>;
  setShowPaywall: Dispatch<SetStateAction<boolean>>;
  setFixJobId: Dispatch<SetStateAction<string | null>>;
  setFreeFixLimit: Dispatch<SetStateAction<number>>;
  setFixMessage: Dispatch<SetStateAction<string | null>>;
  setFixEvents: Dispatch<SetStateAction<FixJobEvent[]>>;
  setFixArtifacts: Dispatch<SetStateAction<FixJobArtifact[]>>;
  setFixStartedAt: Dispatch<SetStateAction<number | null>>;
  setFixElapsedMs: Dispatch<SetStateAction<number>>;
  setDemoPlayback: Dispatch<SetStateAction<boolean>>;
  setForceCompleted: Dispatch<SetStateAction<boolean>>;
  setViewPaused: Dispatch<SetStateAction<boolean>>;
  startDemoPlayback: () => void;
}

export function useFixPolling({
  state,
  fixJobId,
  setAppState,
  showToast,
  canLaunchRealFix,
  unsupportedLegacyDoc,
  paid,
  doneCount,
  freeFixLimit,
  steps,
  setSteps,
  setFixing,
  setShowPaywall,
  setFixJobId,
  setFreeFixLimit,
  setFixMessage,
  setFixEvents,
  setFixArtifacts,
  setFixStartedAt,
  setFixElapsedMs,
  setDemoPlayback,
  setForceCompleted,
  setViewPaused,
  startDemoPlayback,
}: Params) {
  const legacyDocId = getLegacyDocumentId(state);
  const applyFixStatus = useCallback((status: FixStatusResponse) => {
    if (typeof status.freeFixLimit === 'number') {
      setFreeFixLimit(status.freeFixLimit);
    }
    setFixMessage(status.message || null);
    setFixEvents(status.events || []);
    setFixArtifacts(status.artifacts || []);
    const completedMap = new Map((status.completedSteps || []).map((step) => [step.type, step]));

    setSteps((prev) => prev.map((step) => {
      const completed = completedMap.get(step.type);
      if (completed?.status === 'done') {
        return { ...step, status: 'done', summary: completed.summary };
      }
      if (status.status === 'running' && status.currentStep === step.type) {
        return { ...step, status: 'fixing' };
      }
      if (step.status === 'done') return step;
      return { ...step, status: 'pending', summary: step.summary };
    }));
  }, [setFixArtifacts, setFixEvents, setFixMessage, setFreeFixLimit, setSteps]);

  const completeFix = useCallback((status: FixStatusResponse) => {
    applyFixStatus(status);
    setFixing(false);
    setFixJobId(null);
    setAppState({ jobStatus: 'completed' });
    setFixMessage(status.message || '修复完成，可下载真实 DOCX');

    const completedCount = status.completedSteps?.length || 0;
    if (!paid && doneCount + completedCount < steps.length) {
      setShowPaywall(true);
      showToast(`已免费修复 ${freeFixLimit} 项，解锁后可继续全部修复`);
    } else {
      showToast('全部修复完成！');
    }
  }, [applyFixStatus, doneCount, freeFixLimit, paid, setAppState, setFixJobId, setFixMessage, setFixing, setShowPaywall, showToast, steps.length]);

  const fetchFreeFixLimit = useCallback(async (): Promise<number> => {
    try {
      const health = await api.health();
      if (typeof health.freeFixLimit === 'number') {
        setFreeFixLimit(health.freeFixLimit);
        return health.freeFixLimit;
      }
    } catch {
      // Keep the last known free limit when config probing is unavailable.
    }
    return freeFixLimit;
  }, [freeFixLimit, setFreeFixLimit]);

  const getNextFixTypes = useCallback((limit: number): FixType[] => {
    const pending = steps.filter((step) => step.status !== 'done').map((step) => step.type);
    if (paid) return pending;
    return pending.slice(0, Math.max(limit - doneCount, 0));
  }, [doneCount, paid, steps]);

  const launchFixJob = useCallback(async (fixTypes: FixType[]) => {
    if (!legacyDocId || !state.schoolId) {
      showToast('缺少文档或学校规则，无法启动修复');
      return;
    }
    if (fixTypes.length === 0) {
      if (!paid && doneCount >= freeFixLimit) {
        setShowPaywall(true);
      }
      return;
    }

    try {
      const nextCurrent = fixTypes[0];
      setSteps((prev) => prev.map((step) => {
        if (step.status === 'done') return step;
        if (step.type === nextCurrent) return { ...step, status: 'fixing' };
        return { ...step, status: 'pending' };
      }));
      setFixing(true);
      setDemoPlayback(false);
      setForceCompleted(false);
      setViewPaused(false);
      setShowPaywall(false);
      setFixStartedAt(Date.now());
      setFixElapsedMs(0);

      const job = await api.createFixJob({
        legacyDocId,
        jobId: state.jobId || undefined,
        profileId: state.schoolId,
        selectedFixes: fixTypes,
      });
      if (typeof job.freeFixLimit === 'number') {
        setFreeFixLimit(job.freeFixLimit);
      }
      setFixJobId(job.jobId);
      setAppState({ jobId: job.jobId, jobStatus: job.status });
    } catch (err: any) {
      setFixing(false);
      setFixJobId(null);
      startDemoPlayback();
      showToast(`启动修复失败，已切换演示模式: ${err.message}`);
    }
  }, [
    doneCount,
    freeFixLimit,
    paid,
    setAppState,
    setDemoPlayback,
    setFixElapsedMs,
    setFixJobId,
    setFixStartedAt,
    setFixing,
    setForceCompleted,
    setFreeFixLimit,
    setShowPaywall,
    setSteps,
    setViewPaused,
    showToast,
    startDemoPlayback,
    legacyDocId,
    state.jobId,
    state.schoolId,
  ]);

  const onStartFix = useCallback(() => {
    if (unsupportedLegacyDoc) {
      setFixMessage(LEGACY_DOC_HINT);
      showToast(LEGACY_DOC_HINT);
      return;
    }
    if (!canLaunchRealFix) {
      startDemoPlayback();
      setFixMessage(BROWSE_MODE_FIX_HINT);
      return;
    }
    void (async () => {
      const currentFreeFixLimit = await fetchFreeFixLimit();
      const nextFixTypes = getNextFixTypes(currentFreeFixLimit);
      await launchFixJob(nextFixTypes);
    })();
  }, [
    canLaunchRealFix,
    fetchFreeFixLimit,
    getNextFixTypes,
    launchFixJob,
    setFixMessage,
    showToast,
    startDemoPlayback,
    unsupportedLegacyDoc,
  ]);

  const onPay = useCallback(() => {
    setShowPaywall(false);
    setViewPaused(false);
    setForceCompleted(false);
    showToast('已解锁全部修复');
    const remainingFixTypes = steps.filter((step) => step.status !== 'done').map((step) => step.type);
    void launchFixJob(remainingFixTypes);
  }, [launchFixJob, setForceCompleted, setShowPaywall, setViewPaused, showToast, steps]);

  const onSkipPay = useCallback(() => {
    setShowPaywall(false);
    showToast('免费修复已应用，解锁后可继续修复全部问题');
  }, [setShowPaywall, showToast]);

  useEffect(() => {
    if (!fixJobId || fixJobId === 'demo') return;
    if (!state.jobStatus || state.jobStatus === 'completed' || state.jobStatus === 'failed') return;

    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const status = await api.getFixStatus(fixJobId);
        if (cancelled) return;
        applyFixStatus(status);

        if (status.status === 'done') {
          completeFix(status);
          return;
        }

        if (status.status === 'failed') {
          setFixing(false);
          setFixJobId(null);
          setAppState({ jobStatus: 'failed' });
          setFixMessage(status.errorMessage || status.message || '修复失败');
          setSteps((prev) => prev.map((step) =>
            status.currentStep === step.type ? { ...step, status: 'failed' } : step,
          ));
          const errorText = status.errorMessage || status.message || '';
          showToast(errorText.includes('旧版 .doc 格式') ? LEGACY_DOC_HINT : `修复失败：${errorText || '请重试'}`);
          return;
        }

        timer = window.setTimeout(poll, 800);
      } catch (err: any) {
        if (cancelled) return;
        setFixing(false);
        setFixJobId(null);
        const errorText = err?.message || '状态暂不可用';
        setFixMessage(errorText.includes('not a fix job') ? '修复任务正在切换到本地演示模式。' : errorText);
        if (errorText.includes('not a fix job')) {
          startDemoPlayback();
          return;
        }
        showToast(`修复状态查询失败: ${errorText}`);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [applyFixStatus, completeFix, fixJobId, setAppState, setFixJobId, setFixMessage, setFixing, setSteps, showToast, startDemoPlayback, state.jobStatus]);

  return {
    onStartFix,
    onPay,
    onSkipPay,
    fetchFreeFixLimit,
    getNextFixTypes,
    launchFixJob,
  };
}
