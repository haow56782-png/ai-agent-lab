import type { AppState, SchoolOption } from '../../components/AppFrame';
import type { FixJobArtifact, FixJobEvent, FixType } from '../../api/client';
import type { FixRuntimeStore, LiveDocumentFrame } from '../../components/fix-runtime/types';
import type { FixAction } from '../../mock/fixActions';
import type { PaperContent } from '../../mock/paperContent';

export interface FixStep {
  type: FixType;
  label: string;
  icon: string;
  desc: string;
  status: 'pending' | 'fixing' | 'done' | 'skipped' | 'failed';
  summary?: string;
}

export interface UseFixFlowControllerArgs {
  state: AppState;
  set: (patch: Partial<AppState>) => void;
  school: SchoolOption | null;
  showToast: (msg: string) => void;
}

export interface UseFixFlowControllerResult {
  showPaywall: boolean;
  freeFixLimit: number;
  totalCount: number;
  runtimeNarrative: string;
  documentTitle: string;
  activeLiveFrame: LiveDocumentFrame | null;
  runtimeStore: FixRuntimeStore;
  paperContent: PaperContent;
  fixActions: FixAction[];
  fixEvents: FixJobEvent[];
  fixArtifacts: FixJobArtifact[];
  onPauseToggle: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onJumpToComplete: () => void;
  onStartFix: () => void;
  onPay: () => void;
  onSkipPay: () => void;
}
