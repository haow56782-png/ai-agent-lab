// Finding store is a pure data container, not a UI synchronization layer.
// It indexes by findingId and keeps focusFindingId as the only focus state.
// It never indexes by currentPage; page is derived by selectors only.
// Status updates are delegated to the Finding status machine.
import type { Finding } from './schema.ts';
import type { FindingStatusAction } from './status-machine.ts';
import { transitionFindingStatus } from './status-machine.ts';

export interface FindingState {
  byId: Record<string, Finding>;
  allIds: string[];
  focusFindingId: string | null;
}

export function createFindingState(findings: Finding[] = [], focusFindingId: string | null = null): FindingState {
  return upsertFindings({ byId: {}, allIds: [], focusFindingId: null }, findings, focusFindingId);
}

export function upsertFindings(state: FindingState, findings: Finding[], requestedFocusId = state.focusFindingId): FindingState {
  const byId = { ...state.byId };
  const idSet = new Set(state.allIds);
  findings.forEach((finding) => {
    byId[finding.findingId] = finding;
    idSet.add(finding.findingId);
  });
  const allIds = Array.from(idSet).sort((leftId, rightId) => {
    const left = byId[leftId];
    const right = byId[rightId];
    const leftPage = left.anchor.pageIndex ?? Number.MAX_SAFE_INTEGER;
    const rightPage = right.anchor.pageIndex ?? Number.MAX_SAFE_INTEGER;
    if (leftPage !== rightPage) return leftPage - rightPage;
    return (left.anchor.charOffset ?? left.span.start) - (right.anchor.charOffset ?? right.span.start);
  });
  const focusFindingId = requestedFocusId && byId[requestedFocusId]
    ? requestedFocusId
    : allIds[0] ?? null;
  return { byId, allIds, focusFindingId };
}

export function setFocusFinding(state: FindingState, findingId: string | null): FindingState {
  if (findingId !== null && !state.byId[findingId]) return state;
  return { ...state, focusFindingId: findingId };
}

export function applyFindingStatusAction(state: FindingState, findingId: string, action: FindingStatusAction, now?: string): FindingState {
  const finding = state.byId[findingId];
  if (!finding) return state;
  const result = transitionFindingStatus(finding, action, now);
  if (!result.ok) return state;
  return {
    ...state,
    byId: {
      ...state.byId,
      [findingId]: result.finding,
    },
  };
}

export function removeFinding(state: FindingState, findingId: string): FindingState {
  if (!state.byId[findingId]) return state;
  const byId = { ...state.byId };
  delete byId[findingId];
  const allIds = state.allIds.filter((id) => id !== findingId);
  const focusFindingId = state.focusFindingId === findingId ? allIds[0] ?? null : state.focusFindingId;
  return { byId, allIds, focusFindingId };
}
