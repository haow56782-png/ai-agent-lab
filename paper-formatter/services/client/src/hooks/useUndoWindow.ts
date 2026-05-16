// useUndoWindow — hook for per-finding and batch undo with 10-second countdown.
// After a finding is accepted/rejected, the action is reversible for 10 seconds.
// After a batch accept-all, a global undo bar appears.

import { useCallback, useEffect, useRef, useState } from 'react';

const UNDO_WINDOW_MS = 10_000;

export interface UndoEntry {
  findingId: string;
  previousStatus: string;
  timestamp: number;
}

interface UndoWindowState {
  /** Individual finding undos, keyed by findingId */
  entries: Record<string, UndoEntry>;
  /** Batch undo: all findingIds in a single batch operation */
  batchIds: string[];
  batchPreviousStatuses: Record<string, string>;
  batchTimestamp: number;
}

export function useUndoWindow() {
  const [state, setState] = useState<UndoWindowState>({
    entries: {},
    batchIds: [],
    batchPreviousStatuses: {},
    batchTimestamp: 0,
  });
  const timersRef = useRef<Record<string, number>>({});
  const batchTimerRef = useRef<number | null>(null);

  const clearFindingTimer = useCallback((findingId: string) => {
    if (timersRef.current[findingId]) {
      window.clearTimeout(timersRef.current[findingId]);
      delete timersRef.current[findingId];
    }
  }, []);

  const clearBatchTimer = useCallback(() => {
    if (batchTimerRef.current !== null) {
      window.clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
  }, []);

  /** Register a single finding undo action. */
  const registerUndo = useCallback((findingId: string, previousStatus: string) => {
    clearFindingTimer(findingId);
    const entry: UndoEntry = { findingId, previousStatus, timestamp: Date.now() };
    setState((prev) => ({
      ...prev,
      entries: { ...prev.entries, [findingId]: entry },
    }));
    timersRef.current[findingId] = window.setTimeout(() => {
      setState((prev) => {
        const nextEntries = { ...prev.entries };
        delete nextEntries[findingId];
        return { ...prev, entries: nextEntries };
      });
      delete timersRef.current[findingId];
    }, UNDO_WINDOW_MS);
  }, [clearFindingTimer]);

  /** Register a batch undo (accept all / reject all). */
  const registerBatchUndo = useCallback((findingIds: string[], previousStatuses: Record<string, string>) => {
    clearBatchTimer();
    setState((prev) => ({
      ...prev,
      batchIds: findingIds,
      batchPreviousStatuses: previousStatuses,
      batchTimestamp: Date.now(),
    }));
    batchTimerRef.current = window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        batchIds: [],
        batchPreviousStatuses: {},
        batchTimestamp: 0,
      }));
      batchTimerRef.current = null;
    }, UNDO_WINDOW_MS);
  }, [clearBatchTimer]);

  /** Dismiss the batch undo bar early. */
  const dismissBatchUndo = useCallback(() => {
    clearBatchTimer();
    setState((prev) => ({
      ...prev,
      batchIds: [],
      batchPreviousStatuses: {},
      batchTimestamp: 0,
    }));
  }, [clearBatchTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(window.clearTimeout);
      if (batchTimerRef.current !== null) window.clearTimeout(batchTimerRef.current);
    };
  }, []);

  const hasUndo = (findingId: string): boolean => findingId in state.entries;

  const hasBatchUndo = state.batchIds.length > 0;

  const batchRemainingMs = hasBatchUndo
    ? Math.max(0, UNDO_WINDOW_MS - (Date.now() - state.batchTimestamp))
    : 0;

  // Update batch remaining time
  const [batchDisplayMs, setBatchDisplayMs] = useState(0);
  useEffect(() => {
    if (!hasBatchUndo) {
      setBatchDisplayMs(0);
      return;
    }
    setBatchDisplayMs(batchRemainingMs);
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, UNDO_WINDOW_MS - (Date.now() - state.batchTimestamp));
      setBatchDisplayMs(remaining);
      if (remaining <= 0) window.clearInterval(interval);
    }, 200);
    return () => window.clearInterval(interval);
  }, [hasBatchUndo, state.batchTimestamp]);

  return {
    entries: state.entries,
    hasUndo,
    registerUndo,
    hasBatchUndo,
    batchIds: state.batchIds,
    batchPreviousStatuses: state.batchPreviousStatuses,
    batchDisplayMs,
    registerBatchUndo,
    dismissBatchUndo,
  };
}
