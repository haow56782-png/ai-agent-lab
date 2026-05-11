// Finding selectors derive all view state from focusFindingId.
// currentPage is a projection of focusFinding.anchor.pageIndex, never a store key.
// rulePath is resolved through ruleId and the rule resolver, never through page.
// Selectors are pure functions and never mutate FindingState.
import type { RuleRegistry, RuleResolveResult } from '../rule/rule-resolver.ts';
import { resolveRulePath } from '../rule/rule-resolver.ts';
import type { Finding, FindingAnchor, FindingSpan } from './schema.ts';
import type { FindingState } from './store.ts';

export function selectAllFindings(state: FindingState): Finding[] {
  return state.allIds.map((id) => state.byId[id]).filter(Boolean);
}

export function selectFocusedFinding(state: FindingState): Finding | null {
  return state.focusFindingId ? state.byId[state.focusFindingId] ?? null : null;
}

export function selectCurrentPage(state: FindingState): number | null {
  return selectFocusedFinding(state)?.anchor.pageIndex ?? null;
}

export function selectFocusedRulePath(state: FindingState, registry: RuleRegistry): RuleResolveResult | null {
  const finding = selectFocusedFinding(state);
  if (!finding) return null;
  return resolveRulePath(finding.ruleId, registry, finding.rulePath);
}

export function selectHighlightAnchor(state: FindingState): FindingAnchor | null {
  return selectFocusedFinding(state)?.anchor ?? null;
}

export function selectHighlightSpan(state: FindingState): FindingSpan | null {
  return selectFocusedFinding(state)?.span ?? null;
}

export function selectFindingsByRuleId(state: FindingState, ruleId: string): Finding[] {
  return selectAllFindings(state).filter((finding) => finding.ruleId === ruleId);
}

export function selectPendingFindings(state: FindingState): Finding[] {
  return selectAllFindings(state).filter((finding) => finding.status === 'pending');
}
