// Finding-centric review store for the three-pane thesis review workbench.
// focusFindingId is the only focus SSOT; current page is always derived from it.
// All focus writes must go through setFocus(id, source), which owns the scroll lock.
// URL hash persistence is centralized here so panes never sync focus directly.
import { useSyncExternalStore } from 'react';
import type {
  AuditAction,
  AuditRecord,
  ExemptionRecord,
  FindingContract,
  FindingStatus,
} from '../../../../packages/shared-types/src/finding-contract';

export type ReviewScrollSource = 'canvas' | 'pane' | 'rule' | null;

export interface Finding extends FindingContract {
  pageNo: number;
  anchorRect: { x: number; y: number; w: number; h: number };
  ruleBreadcrumb: string[];
  problem: string;
  suggestionText: string;
  before: string;
  after: string;
  ruleId: string;
}

export interface ReviewState {
  focusFindingId: string | null;
  findings: Finding[];
  scrollSource: ReviewScrollSource;
  audit_trail: AuditRecord[];
  p1Exemption: ExemptionRecord | null;
}

type Listener = () => void;

const HASH_PREFIX = '#finding=';
const REVIEW_PERSISTENCE_KEY = 'paper-formatter:step4diff:demo';

type PersistedFindingStatus = 'accepted' | 'ignored' | 'self_edited';

interface PersistedReviewState {
  ruleActions?: Array<[string, PersistedFindingStatus]>;
  activeRuleId?: string | null;
  focusFindingId?: string | null;
  page?: number | null;
}

function toPersistedStatus(status: FindingStatus): PersistedFindingStatus | null {
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'ignored';
  return null;
}

function fromPersistedStatus(status: PersistedFindingStatus | undefined): FindingStatus | null {
  if (status === 'accepted') return 'accepted';
  if (status === 'ignored') return 'rejected';
  if (status === 'self_edited') return 'self_edited';
  return null;
}

class ReviewStore {
  private state: ReviewState = {
    focusFindingId: null,
    findings: [],
    scrollSource: null,
    audit_trail: [],
    p1Exemption: null,
  };

  private listeners = new Set<Listener>();
  private releaseTimer: number | null = null;
  private pendingFocusRetryTimer: number | null = null;
  private hashSyncStarted = false;
  private suppressHashWrite = false;

  getSnapshot = () => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  hydrateFindings = (findings: Finding[]) => {
    const sortedFindings = [...findings].sort((left, right) => {
      if (left.pageNo !== right.pageNo) return left.pageNo - right.pageNo;
      return left.anchorRect.y - right.anchorRect.y;
    });
    const focusExists = sortedFindings.some((finding) => finding.finding_id === this.state.focusFindingId);
    const hashFocus = this.readHashFocus();
    const hashExists = hashFocus && sortedFindings.some((finding) => finding.finding_id === hashFocus);
    const persistedState = this.readPersistedState();
    const persistedFocus = persistedState?.activeRuleId ?? persistedState?.focusFindingId ?? null;
    const persistedFocusExists = persistedFocus && sortedFindings.some((finding) => finding.finding_id === persistedFocus);
    const persistedStatusMap = new Map(persistedState?.ruleActions ?? []);
    const nextFocusFindingId = focusExists
      ? this.state.focusFindingId
      : hashExists
      ? hashFocus
      : persistedFocusExists
      ? persistedFocus
      : sortedFindings[0]?.finding_id ?? null;
    this.state = {
      ...this.state,
      findings: sortedFindings.map((finding) => {
        const current = this.state.findings.find((item) => item.finding_id === finding.finding_id);
        const persistedStatus = fromPersistedStatus(persistedStatusMap.get(finding.finding_id));
        return current
          ? {
            ...finding,
            status: current.status !== 'pending' ? current.status : persistedStatus ?? finding.status,
            audit_trail: current.audit_trail,
          }
          : {
            ...finding,
            status: persistedStatus ?? finding.status,
          };
      }),
      focusFindingId: nextFocusFindingId ?? null,
      scrollSource: hashExists ? 'pane' : this.state.scrollSource,
    };
    this.persistState();
    this.emit();
    if (hashExists) this.releaseScrollLock();
  };

  setFocus = (id: string | null, source: Exclude<ReviewScrollSource, null>) => {
    if (id && !this.state.findings.some((finding) => finding.finding_id === id)) return;
    if (this.state.scrollSource && this.state.scrollSource !== source) {
      if (this.state.scrollSource === 'canvas' && source !== 'canvas') {
        if (this.releaseTimer !== null) window.clearTimeout(this.releaseTimer);
      } else {
      if (source !== 'canvas') {
        if (this.pendingFocusRetryTimer !== null) window.clearTimeout(this.pendingFocusRetryTimer);
        this.pendingFocusRetryTimer = window.setTimeout(() => {
          this.pendingFocusRetryTimer = null;
          this.setFocus(id, source);
        }, 170);
      }
      return;
      }
    }

    this.state = {
      ...this.state,
      scrollSource: source,
      focusFindingId: id,
    };
    this.writeHash(id);
    this.persistState();
    this.emit();

    this.releaseScrollLock();
  };

  setFindingStatus = (id: string, status: FindingStatus) => {
    const current = this.state.findings.find((finding) => finding.finding_id === id);
    if (!current || current.status === status) return;
    const auditEntry = this.createAuditEntry({
      findingId: id,
      action: status === 'accepted' ? 'accept' : status === 'rejected' ? 'reject' : status === 'self_edited' ? 'self_edit' : 'manual_review_complete',
      fromStatus: current.status,
      toStatus: status,
    });
    this.state = {
      ...this.state,
      findings: this.state.findings.map((finding) => (
        finding.finding_id === id
          ? { ...finding, status, updated_at: auditEntry.timestamp, audit_trail: [...finding.audit_trail, auditEntry] }
          : finding
      )),
      audit_trail: [...this.state.audit_trail, auditEntry],
    };
    this.persistState();
    this.emit();
  };

  recordP1Exemption = (findingIds: string[], reason: string) => {
    const timestamp = new Date().toISOString();
    const entries = findingIds.map((findingId) => this.createAuditEntry({
      findingId,
      action: 'exempt',
      reason,
      timestamp,
    }));
    this.state = {
      ...this.state,
      p1Exemption: {
        exempted_finding_ids: findingIds,
        actor_id: 'local-author',
        actor_role: 'Author',
        reason,
        acknowledged: true,
        timestamp,
      },
      findings: this.state.findings.map((finding) => (
        findingIds.includes(finding.finding_id)
          ? { ...finding, audit_trail: [...finding.audit_trail, ...entries.filter((entry) => entry.target_id === finding.finding_id)] }
          : finding
      )),
      audit_trail: [...this.state.audit_trail, ...entries],
    };
    this.persistState();
    this.emit();
  };

  initializeHashSync = () => {
    if (this.hashSyncStarted || typeof window === 'undefined') return;
    this.hashSyncStarted = true;
    window.addEventListener('hashchange', () => {
      if (this.suppressHashWrite) return;
      const id = this.readHashFocus();
      if (!id) return;
      if (!this.state.findings.some((finding) => finding.finding_id === id)) return;
      this.setFocus(id, 'pane');
    });
  };

  private readHashFocus() {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash || '';
    if (!hash.startsWith(HASH_PREFIX)) return null;
    const id = decodeURIComponent(hash.slice(HASH_PREFIX.length));
    return id || null;
  }

  private writeHash(id: string | null) {
    if (typeof window === 'undefined') return;
    const nextHash = id ? `${HASH_PREFIX}${encodeURIComponent(id)}` : '';
    if (window.location.hash === nextHash) return;
    this.suppressHashWrite = true;
    if (nextHash) {
      window.history.replaceState(null, '', nextHash);
    } else {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    window.setTimeout(() => {
      this.suppressHashWrite = false;
    }, 0);
  }

  private readPersistedState(): PersistedReviewState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(REVIEW_PERSISTENCE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedReviewState;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private persistState() {
    if (typeof window === 'undefined') return;
    const focusedFinding = this.state.findings.find((finding) => finding.finding_id === this.state.focusFindingId) ?? null;
    const ruleActions = this.state.findings
      .map((finding): [string, PersistedFindingStatus] | null => {
        const status = toPersistedStatus(finding.status);
        return status ? [finding.finding_id, status] : null;
      })
      .filter((item): item is [string, PersistedFindingStatus] => !!item);
    const nextState: PersistedReviewState = {
      ruleActions,
      activeRuleId: this.state.focusFindingId,
      focusFindingId: this.state.focusFindingId,
      page: focusedFinding?.pageNo ?? null,
    };
    window.localStorage.setItem(REVIEW_PERSISTENCE_KEY, JSON.stringify(nextState));
  }

  private releaseScrollLock() {
    if (this.releaseTimer !== null) window.clearTimeout(this.releaseTimer);
    window.requestAnimationFrame(() => {
      this.releaseTimer = window.setTimeout(() => {
        this.state = { ...this.state, scrollSource: null };
        this.releaseTimer = null;
        this.emit();
      }, 150);
    });
  }

  private createAuditEntry(input: {
    findingId: string;
    action: AuditAction;
    fromStatus?: FindingStatus;
    toStatus?: FindingStatus;
    reason?: string;
    timestamp?: string;
  }): AuditRecord {
    const timestamp = input.timestamp ?? new Date().toISOString();
    return {
      audit_id: this.createLocalId('audit'),
      target_type: input.action === 'exempt' ? 'exemption' : 'finding',
      target_id: input.findingId,
      actor_id: 'local-author',
      actor_role: 'Author',
      action: input.action,
      timestamp,
      from_state: input.fromStatus,
      to_state: input.toStatus,
      snapshot_ref: `finding-snapshot:${input.findingId}`,
      metadata: input.reason ? { exemption_reason: input.reason } : undefined,
    };
  }

  private createLocalId(prefix: string) {
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${uuid}`;
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

const reviewStore = new ReviewStore();

export function useReviewStore<T>(selector: (state: ReviewState) => T): T {
  return useSyncExternalStore(
    reviewStore.subscribe,
    () => selector(reviewStore.getSnapshot()),
    () => selector(reviewStore.getSnapshot()),
  );
}

export const reviewActions = {
  hydrateFindings: reviewStore.hydrateFindings,
  initializeHashSync: reviewStore.initializeHashSync,
  recordP1Exemption: reviewStore.recordP1Exemption,
  setFindingStatus: reviewStore.setFindingStatus,
  setFocus: reviewStore.setFocus,
};

export function selectFocusedFinding(state: ReviewState) {
  return state.findings.find((finding) => finding.finding_id === state.focusFindingId) ?? null;
}

export function selectCurrentPage(state: ReviewState) {
  return selectFocusedFinding(state)?.pageNo ?? null;
}

export function selectBlockingPendingFindings(state: ReviewState) {
  return state.findings.filter((finding) => finding.status === 'pending' && finding.severity !== 'P2');
}
