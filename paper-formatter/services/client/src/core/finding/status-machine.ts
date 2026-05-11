// Finding status machine centralizes all allowed business transitions.
// UI code must call this module instead of writing raw status strings.
// The machine is deliberately small for Phase 1 and can be audited by tests.
// It has no dependency on page, currentPage, or UI state.
import type { Finding, FindingStatus } from './schema.ts';

export type FindingStatusAction =
  | 'accept'
  | 'ignore'
  | 'self_edit'
  | 'start_rejudge'
  | 'resolve'
  | 'fail'
  | 'mark_conflict'
  | 'reset';

const TRANSITIONS: Record<FindingStatus, Partial<Record<FindingStatusAction, FindingStatus>>> = {
  pending: {
    accept: 'accepted',
    ignore: 'ignored',
    self_edit: 'self_edited',
    start_rejudge: 'rejudging',
    mark_conflict: 'conflicted',
  },
  accepted: {
    start_rejudge: 'rejudging',
    reset: 'pending',
  },
  ignored: {
    start_rejudge: 'rejudging',
    reset: 'pending',
  },
  self_edited: {
    start_rejudge: 'rejudging',
    reset: 'pending',
  },
  rejudging: {
    resolve: 'resolved',
    fail: 'failed',
    mark_conflict: 'conflicted',
  },
  resolved: {
    start_rejudge: 'rejudging',
  },
  failed: {
    start_rejudge: 'rejudging',
    reset: 'pending',
  },
  conflicted: {
    self_edit: 'self_edited',
    start_rejudge: 'rejudging',
    reset: 'pending',
  },
};

export interface FindingTransitionResult {
  ok: boolean;
  status: FindingStatus;
  error?: string;
}

export function getNextFindingStatus(current: FindingStatus, action: FindingStatusAction): FindingTransitionResult {
  const next = TRANSITIONS[current]?.[action];
  if (!next) {
    return {
      ok: false,
      status: current,
      error: `Cannot apply action "${action}" to Finding status "${current}"`,
    };
  }
  return { ok: true, status: next };
}

export function canTransitionFindingStatus(current: FindingStatus, action: FindingStatusAction): boolean {
  return getNextFindingStatus(current, action).ok;
}

export function transitionFindingStatus(finding: Finding, action: FindingStatusAction, now = new Date().toISOString()): FindingTransitionResult & { finding: Finding } {
  const result = getNextFindingStatus(finding.status, action);
  if (!result.ok) {
    return { ...result, finding };
  }
  return {
    ...result,
    finding: {
      ...finding,
      status: result.status,
      updatedAt: now,
    },
  };
}
