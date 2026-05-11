import type { FixJobArtifact, FixJobEvent } from '../../api/client';
import type { FixAction } from '../../mock/fixActions';
import type { PaperBlock, PaperContent } from '../../mock/paperContent';

export interface FixRuntimeStore {
  totalItems: number;
  fixedItems: number;
  progressPct: number;
  currentChapter: string;
  currentPage: number;
  totalPages: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  status: 'running' | 'paused' | 'completed';
  speed: 1 | 2 | 4;
}

export interface LiveDocumentFrame {
  chapter: string;
  focusAnchor: string;
  rule: string;
  baseline: string;
}

export interface FixTimelineProps {
  runtimeStore: FixRuntimeStore;
  runtimeNarrative: string;
  documentTitle: string;
  activeFrame: LiveDocumentFrame | null;
  paperContent: PaperContent;
  fixActions: FixAction[];
  fixEvents: FixJobEvent[];
  fixArtifacts: FixJobArtifact[];
  onPauseToggle: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onJumpToComplete: () => void;
  onViewDiff: () => void;
  onStartFix: () => void;
}

export interface TimelineRow {
  id: string;
  timestamp: string;
  chapter: string;
  page: number;
  paragraphIndex: number;
  before: string;
  after: string;
  ruleLabel: string;
  type: FixAction['type'];
  status: 'done' | 'live' | 'needs-review';
}

export interface TimelineRowSummary {
  chapter: string;
  before: string;
  after: string;
  ruleLabel: string;
  type: FixAction['type'];
}

export interface PageTextBlock {
  paragraphIndex: number;
  blockIndex: number;
  block: PaperBlock;
}

export interface AnnotationLayout {
  top: number;
  left: number;
  leaderWidth: number;
  noteWidth: number;
}

export interface RecentActionMeta {
  completedAt: number;
  page: number;
  paragraphIndex: number;
}

export interface PageDecorations {
  deletedKeys: Set<string>;
  activeDeletedKeys: Set<string>;
  replacements: Map<string, { actionId: string; payload: string; active: boolean }>;
  inserts: Map<string, FixAction[]>;
  annotations: FixAction[];
}

export interface VisibleRuleCard {
  id: string;
  source: '学校规则' | '国标';
  code: string;
  name: string;
  summary: string;
  hitCount: number;
}
