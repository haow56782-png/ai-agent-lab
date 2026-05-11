// ─── Document Types ─────────────────────────────────────────
export type {
  FixStatusResponse,
  FixStepResult,
  FixType,
  AnalyzeJobCommand,
  FixJobCommand,
  FormatJobCommand,
  JobError,
  JobPatch,
  JobRuleDetail,
  JobRuleHitItem,
  JobRuleHitLocation,
  JobStatus,
  JobType,
  LegacyDocumentCommand,
  PublicJobRecord as JobRecord,
  PublicJobResult,
  QueuedJobResponse,
  StoredJobRecord,
} from "./job-contract";

export type {
  ActorRole,
  AuditAction,
  AuditRecord,
  AuditTargetType,
  EvidenceSpan,
  ExemptionRecord,
  FindingContract,
  FindingDispositionRequest,
  FindingDocumentQuery,
  FindingListQuery,
  FindingSeverity,
  FindingSelfEditRequest,
  FindingStatus,
  FindingSuggestion,
  FindingSuggestionType,
  FindingSyncCommand,
  FindingSyncRequest,
  FindingSyncResponse,
  P1ExemptionCommand,
  P1ExemptionRequest,
  P1ExemptionResponse,
  RuleSnapshot,
} from "./finding-contract";

export type {
  DownloadBlockReason,
  FindingDownloadGuardInput,
  FindingDownloadGuardResult,
} from "./finding-download-guard";
export { canDownloadByFindings } from "./finding-download-guard";

export type FileType = "docx" | "pdf" | "unknown";
export type ProfileSource = "official" | "template_derived" | "manual";
export type GBVersion = "GB/T 7714-2015" | "GB/T 7714-2025";

export interface DocumentRecord {
  docId: string;
  canonicalDocumentId?: string;
  filename: string;
  size: number;
  sha256: string;
  fileType: FileType;
  pages?: number;
  isScannedPdf?: boolean;
  createdAt: string;
}

// ─── Profile Types ──────────────────────────────────────────

export interface SchoolFormatProfile {
  id: string;
  schoolId: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  faculty?: string;
  major?: string;
  gbVersion: GBVersion;
  rules: FormatRule[];
  styleMap: StyleMapping[];
  metadata: ProfileMetadata;
}

export interface FormatRule {
  ruleId: string;
  category: RuleCategory;
  target: string;
  property: string;
  value: unknown;
  priority: number;
  condition?: string;
}

export type RuleCategory =
  | "page_setup" | "font" | "heading" | "paragraph"
  | "caption" | "table" | "reference" | "toc"
  | "page_number" | "section" | "header_footer";

export interface StyleMapping {
  sourceStyle: string;
  targetStyle: string;
  fallbackStyle: string;
  modifications: StyleModification[];
}

export interface StyleModification {
  property: string;
  value: unknown;
}

export interface ProfileMetadata {
  sourceType: ProfileSource;
  sourceHash: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

// ─── Document Structure ─────────────────────────────────────

export interface DocumentStructure {
  docId: string;
  sections: SectionInfo[];
  headings: HeadingInfo[];
  paragraphs: ParagraphInfo[];
  captions: CaptionInfo[];
  tables: TableInfo[];
  footnotes: FootnoteInfo[];
  endnotes: EndnoteInfo[];
  references: ReferenceInfo[];
  equations: EquationInfo[];
  layoutFlags: LayoutFlags;
  parseConfidence: number;
}

export interface SectionInfo {
  index: number;
  type: "cover" | "abstract" | "toc" | "body" | "appendix" | "acknowledgement";
  pageNumberStyle?: "roman" | "arabic";
  pageStart?: number;
  confidence: number;
}

export interface HeadingInfo {
  index: number;
  level: number;           // 1-4
  text: string;
  detectedStyle: string;
  targetStyle?: string;    // 映射后
  confidence: number;
}

export interface ParagraphInfo {
  index: number;
  text: string;
  styleName: string;
  isListItem: boolean;
  isCaption: boolean;
}

export interface CaptionInfo {
  index: number;
  type: "figure" | "table";
  text: string;
  number?: string;
  position: "above" | "below";
  pageIndex: number;
}

export interface TableInfo { index: number; rows: number; cols: number; hasHeader: boolean; }
export interface FootnoteInfo { index: number; text: string; }
export interface EndnoteInfo { index: number; text: string; }
export interface ReferenceInfo { index: number; text: string; confidence: number; }
export interface EquationInfo { index: number; type: "inline" | "display"; }

export interface LayoutFlags {
  hasTOC: boolean;
  hasFigureTOC: boolean;
  hasTableTOC: boolean;
  pageNumbering: string;
  hasCoverPage: boolean;
  hasAbstract: boolean;
}

// ─── Formatting Plan ───────────────────────────────────────

export interface FormattingPlan {
  planId: string;
  jobId: string;
  profileId: string;
  riskScore: number;
  patches: FormatPatch[];
  manualReviewFlags: string[];
}

export interface FormatPatch {
  patchId: string;
  area: PatchArea;
  elementId: string;
  operation: "replace" | "insert" | "remove";
  ooxmlFragment: string;
  confidence: number;
}

export type PatchArea =
  | "style" | "section" | "page_number" | "toc"
  | "caption" | "reference" | "header_footer" | "font";

// ─── Validation ────────────────────────────────────────────

export interface ValidationReport {
  reportId: string;
  jobId: string;
  contentIntegrity: ContentIntegrity;
  ruleResults: RuleResult[];
  passRate: number;
  warnings: string[];
  errors: string[];
}

export interface ContentIntegrity {
  originalHash: string;
  outputHash: string;
  match: boolean;
  changedParagraphs: TextChange[];
}

export interface TextChange { index: number; text: string; }
export interface RuleResult { ruleId: string; passed: boolean; actual: string; expected: string; }

// ─── Job ────────────────────────────────────────────────────

// ─── API Types ──────────────────────────────────────────────

export interface ApiError {
  error: { code: string; message: string; details?: { field: string; reason: string }[]; requestId: string };
}

export interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number; }
