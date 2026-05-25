import type { FindingStatus } from '../../../../../packages/shared-types/src/finding-contract';

export type DiffActionVisualState = 'accepted' | 'ignored' | undefined;
export type DiffMarkAction = 'delete' | 'replace' | 'annotate' | 'format-hint' | undefined | null;

const QUIET_FINDING_STATUSES = new Set<FindingStatus>([
  'accepted',
  'rejected',
  'self_edited',
  'resolved',
  'closed',
  'superseded',
]);

export function shouldShowFindingMark(status: FindingStatus): boolean {
  return !QUIET_FINDING_STATUSES.has(status);
}

export function shouldShowDiffMark(actionState: DiffActionVisualState): boolean {
  return actionState !== 'accepted' && actionState !== 'ignored';
}

export function isInlineDiffAction(action: DiffMarkAction): boolean {
  return action === 'replace' || action === 'delete';
}

export function isMarginDiffAction(action: DiffMarkAction): boolean {
  return action === 'annotate' || action === 'format-hint';
}
