import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AppState } from '../../components/AppFrame';
import type { FixStep } from './types';

interface Params {
  allDone: boolean;
  totalActionDurationMs: number;
  setAppState: (patch: Partial<AppState>) => void;
  setSteps: Dispatch<SetStateAction<FixStep[]>>;
  setFixing: Dispatch<SetStateAction<boolean>>;
  setFixJobId: Dispatch<SetStateAction<string | null>>;
  setFixMessage: Dispatch<SetStateAction<string | null>>;
  showToast: (msg: string) => void;
}

export function useFixPlayback({
  allDone,
  totalActionDurationMs,
  setAppState,
  setSteps,
  setFixing,
  setFixJobId,
  setFixMessage,
  showToast,
}: Params) {
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [viewPaused, setViewPaused] = useState(false);
  const [forceCompleted, setForceCompleted] = useState(false);
  const [demoPlayback, setDemoPlayback] = useState(false);
  const [fixStartedAt, setFixStartedAt] = useState<number | null>(null);
  const [fixElapsedMs, setFixElapsedMs] = useState(0);
  const [liveFrameIndex, setLiveFrameIndex] = useState(0);
  const queuedCompletionRef = useRef<(() => void) | null>(null);

  const startDemoPlayback = useCallback(() => {
    setDemoPlayback(true);
    setFixing(false);
    setFixJobId(null);
    setForceCompleted(false);
    setViewPaused(false);
    setFixStartedAt(Date.now());
    setFixElapsedMs(0);
    setLiveFrameIndex(0);
    setSteps((prev) => prev.map((step, index) => ({
      ...step,
      status: index === 0 ? 'fixing' : 'pending',
    })));
    setFixMessage('真实修复任务未返回，已切换到本地交互演示模式。');
  }, [setFixJobId, setFixMessage, setFixing, setSteps]);

  const onPauseToggle = useCallback((hasActiveRuntime: boolean) => {
    if (allDone) return;
    if (!hasActiveRuntime) {
      startDemoPlayback();
      return;
    }
    setViewPaused((prev) => {
      const next = !prev;
      if (prev && queuedCompletionRef.current) {
        const finish = queuedCompletionRef.current;
        queuedCompletionRef.current = null;
        window.setTimeout(finish, 120);
      }
      showToast(next ? '已暂停前端审阅视图，后台解析仍会继续' : '已继续前端审阅视图');
      return next;
    });
  }, [allDone, showToast, startDemoPlayback]);

  const onJumpToComplete = useCallback(() => {
    setForceCompleted(true);
    setDemoPlayback(false);
    setFixing(false);
    setFixJobId(null);
    setViewPaused(false);
    setSteps((prev) => prev.map((step) => ({ ...step, status: 'done' })));
    setFixMessage('已直接完成全部批改动作，可进入人工确认。');
    setAppState({ jobStatus: 'completed' });
    showToast('已跳到完成');
  }, [setAppState, setFixJobId, setFixMessage, setFixing, setSteps, showToast]);

  useEffect(() => {
    const hasActiveRuntime = demoPlayback;
    if (!fixStartedAt || !hasActiveRuntime || viewPaused) return;
    const timer = window.setInterval(() => {
      setFixElapsedMs(Date.now() - fixStartedAt);
    }, 500);
    return () => window.clearInterval(timer);
  }, [demoPlayback, fixStartedAt, viewPaused]);

  useEffect(() => {
    const hasActiveRuntime = demoPlayback;
    if (!hasActiveRuntime || viewPaused) return;
    const timer = window.setInterval(() => {
      setLiveFrameIndex((prev) => prev + 1);
    }, Math.max(650, Math.round(2600 / speed)));
    return () => window.clearInterval(timer);
  }, [demoPlayback, speed, viewPaused]);

  useEffect(() => {
    if (!demoPlayback || viewPaused) return;
    if (totalActionDurationMs <= 0) return;
    if (fixElapsedMs < totalActionDurationMs / speed) return;
    const finish = () => {
      setSteps((prev) => prev.map((step) => ({ ...step, status: 'done' })));
      setDemoPlayback(false);
      setForceCompleted(true);
      setFixMessage('演示修复已完成，可进入人工确认。');
      setAppState({ jobStatus: 'completed' });
    };
    finish();
  }, [demoPlayback, fixElapsedMs, setAppState, setFixMessage, setSteps, speed, totalActionDurationMs, viewPaused]);

  return {
    speed,
    viewPaused,
    forceCompleted,
    demoPlayback,
    fixStartedAt,
    fixElapsedMs,
    liveFrameIndex,
    setSpeed,
    setFixStartedAt,
    setFixElapsedMs,
    setLiveFrameIndex,
    setViewPaused,
    setForceCompleted,
    setDemoPlayback,
    startDemoPlayback,
    onPauseToggle,
    onJumpToComplete,
  };
}
