import type { FindingContract } from "./finding-contract";

export type JobType = "analyze" | "format" | "fix";
export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type FixType =
  | "margin"
  | "body_style"
  | "heading"
  | "page_number"
  | "cover"
  | "toc"
  | "duplication_preprocess"
  | "header_footer"
  | "abstract_format"
  | "cross_ref"
  | "caption"
  | "reference_format"
  | "table_format"
  | "image_format"
  | "punctuation";

export interface LegacyDocumentCommand {
  legacyDocId: string;
}

export interface AnalyzeJobCommand extends LegacyDocumentCommand {
  profileId?: string;
}

export interface FormatJobCommand {
  legacyDocId?: string;
  jobId?: string;
  profileId?: string;
}

export interface FixJobCommand {
  jobId?: string;
  legacyDocId?: string;
  profileId?: string;
  fixTypes?: FixType[];
  selectedFixes?: FixType[];
}

export interface JobError {
  code: string;
  message: string;
}

export interface JobRuleHitLocation {
  pageIndex: number;
  bbox?: { x: number; y: number; w: number; h: number };
}

export interface JobRuleHitItem {
  ruleId?: string;
  label: string;
  status: "pass" | "warn" | "fail";
  location?: JobRuleHitLocation;
}

export interface JobRuleDetail {
  cat: string;
  items: Array<JobRuleHitItem | [string, "pass" | "warn"]>;
}

export interface JobSummaryMetrics {
  passed: number;
  warnings: number;
  failed: number;
}

export interface PublicJobResult {
  items?: Array<{ k: string; conf: number; done?: boolean }>;
  log?: string[];
  rules?: JobSummaryMetrics;
  ruleDetails?: JobRuleDetail[];
  findings?: FindingContract[];
  outputPath?: string;
  diffPath?: string;
  summary?: string[];
  parsedTexts?: string[];
  rawHeadings?: Array<string | { text: string }>;
}

export interface PublicJobRecord {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  stage?: string | null;
  docId: string;
  profileId?: string | null;
  planId?: string | null;
  result?: PublicJobResult;
  error?: JobError;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedSeconds?: number | null;
}

export interface QueuedJobResponse {
  jobId: string;
  status: "queued";
  estimatedSeconds: number;
  freeFixLimit?: number;
}

export interface FixStepResult {
  type: FixType;
  status: "done" | "skipped" | "failed";
  summary: string;
  duration: number;
}

export interface FixJobEvent {
  id: string;
  at: string;
  type: "stage" | "artifact" | "warning" | "error";
  stage: string;
  title: string;
  detail: string;
  fixType?: FixType;
  finding_id?: string;
  related_finding_ids?: string[];
}

export interface FixJobArtifact {
  id: string;
  fixType: FixType;
  title: string;
  summary: string;
  details: string[];
  status: "ready" | "needs_review";
  chapter?: string;
  sourceSnippet?: string;
  finding_id?: string;
  related_finding_ids?: string[];
}

export interface FixResult {
  fixedFileId: string;
  totalFixed: number;
  newScore: number;
  contentHash: string;
  originalHash: string;
}

export interface FindingDiffItem {
  finding_id: string;
  related_finding_ids?: string[];
  page: number;
  type: "style_change" | "content_change" | "annotation" | "format_hint";
  action: "delete" | "replace" | "annotate" | "format-hint";
  element: string;
  before: string;
  after: string;
  position: string;
  note: string;
  rule_id?: string;
  rule_group?: string;
}

export interface FindingDiffResult {
  diffs: FindingDiffItem[];
  findingDiffs: FindingDiffItem[];
  summary: {
    pages: number;
    changeCount: number;
    contentChanges: number;
    formatChanges: number;
  };
}

export interface FixStatusResponse {
  status: "running" | "done" | "failed";
  completedSteps: FixStepResult[];
  currentStep?: FixType;
  progress: number;
  stage?: string | null;
  message?: string;
  errorMessage?: string;
  events?: FixJobEvent[];
  artifacts?: FixJobArtifact[];
  freeFixLimit?: number;
  result?: FixResult;
}

export interface StoredJobRecord {
  job_id: string;
  job_type: JobType;
  status: JobStatus;
  progress: number;
  stage: string | null;
  doc_id: string;
  profile_id: string | null;
  plan_id: string | null;
  error_code: string | null;
  error_message: string | null;
  estimated_sec: number | null;
  result_json: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface JobPatch {
  status?: JobStatus;
  progress?: number;
  stage?: string;
  error_code?: string;
  error_message?: string;
  result_json?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
}
