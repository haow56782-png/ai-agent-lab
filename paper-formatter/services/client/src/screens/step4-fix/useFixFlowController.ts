import { useEffect, useRef, useState } from 'react';
import type { FixJobArtifact, FixJobEvent } from '../../api/client';
import { DEFAULT_FREE_FIX_LIMIT, FIX_STEPS } from './constants';
import type { FixStep, UseFixFlowControllerArgs, UseFixFlowControllerResult } from './types';
import { useFixPlayback } from './useFixPlayback';
import { useFixPolling } from './useFixPolling';
import { useFixRuntimeModel } from './useFixRuntimeModel';

export function useFixFlowController({
  state,
  set,
  school,
  showToast,
}: UseFixFlowControllerArgs): UseFixFlowControllerResult {
  const [steps, setSteps] = useState<FixStep[]>(() => FIX_STEPS.map((step) => ({ ...step })));
  const [fixing, setFixing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [fixJobId, setFixJobId] = useState<string | null>(null);
  const [freeFixLimit, setFreeFixLimit] = useState(DEFAULT_FREE_FIX_LIMIT);
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [fixEvents, setFixEvents] = useState<FixJobEvent[]>([]);
  const [fixArtifacts, setFixArtifacts] = useState<FixJobArtifact[]>([]);
  const autoStartTriggeredRef = useRef(false);

  const runtimeSeed = useFixRuntimeModel({
    state,
    school,
    steps,
    fixMessage,
    fixing,
    demoPlayback: false,
    forceCompleted: false,
    viewPaused: false,
    fixElapsedMs: 0,
    liveFrameIndex: 0,
    speed: 1,
  });

  const playback = useFixPlayback({
    allDone: runtimeSeed.allDone,
    totalActionDurationMs: runtimeSeed.totalActionDurationMs,
    setAppState: set,
    setSteps,
    setFixing,
    setFixJobId,
    setFixMessage,
    showToast,
  });

  const runtime = useFixRuntimeModel({
    state,
    school,
    steps,
    fixMessage,
    fixing,
    demoPlayback: playback.demoPlayback,
    forceCompleted: playback.forceCompleted,
    viewPaused: playback.viewPaused,
    fixElapsedMs: playback.fixElapsedMs,
    liveFrameIndex: playback.liveFrameIndex,
    speed: playback.speed,
  });

  const polling = useFixPolling({
    state: {
      ...state,
      jobId: fixJobId || state.jobId,
      jobStatus: fixing ? 'running' : state.jobStatus,
    },
    fixJobId,
    setAppState: set,
    showToast,
    canLaunchRealFix: runtime.canLaunchRealFix,
    unsupportedLegacyDoc: runtime.unsupportedLegacyDoc,
    paid,
    doneCount: runtime.doneCount,
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
    setFixStartedAt: playback.setFixStartedAt,
    setFixElapsedMs: playback.setFixElapsedMs,
    setDemoPlayback: playback.setDemoPlayback,
    setForceCompleted: playback.setForceCompleted,
    setViewPaused: playback.setViewPaused,
    startDemoPlayback: playback.startDemoPlayback,
  });

  const onPauseToggle = () => {
    playback.onPauseToggle(fixing || playback.demoPlayback);
  };

  const onPay = () => {
    setPaid(true);
    polling.onPay();
  };

  useEffect(() => {
    if (autoStartTriggeredRef.current) return;
    if (runtime.unsupportedLegacyDoc || fixing || fixJobId || playback.demoPlayback || runtime.doneCount > 0 || showPaywall) return;
    autoStartTriggeredRef.current = true;
    playback.startDemoPlayback();
    if (!runtime.canLaunchRealFix) {
      setFixMessage('当前是浏览模式，已切换到本地修复演示，不会触发真实写回。');
      return;
    }
    polling.onStartFix();
  }, [
    fixing,
    fixJobId,
    playback.demoPlayback,
    playback.startDemoPlayback,
    polling.onStartFix,
    runtime.canLaunchRealFix,
    runtime.doneCount,
    runtime.unsupportedLegacyDoc,
    showPaywall,
  ]);

  return {
    showPaywall,
    freeFixLimit,
    totalCount: runtime.totalCount,
    runtimeNarrative: runtime.runtimeNarrative,
    documentTitle: runtime.documentTitle,
    activeLiveFrame: runtime.activeLiveFrame,
    runtimeStore: runtime.runtimeStore,
    paperContent: runtime.paperContent,
    fixActions: runtime.fixActions,
    fixEvents,
    fixArtifacts,
    onPauseToggle,
    onSpeedChange: playback.setSpeed,
    onJumpToComplete: playback.onJumpToComplete,
    onStartFix: polling.onStartFix,
    onPay,
    onSkipPay: polling.onSkipPay,
  };
}
