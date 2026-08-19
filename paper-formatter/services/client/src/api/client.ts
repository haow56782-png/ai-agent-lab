import type {
  FindingDiffItem,
  FindingDiffResult,
  FixStatusResponse,
  FixType,
  PublicJobRecord as JobRecord,
  QueuedJobResponse,
} from '../../../../packages/shared-types/src/job-contract';
import type {
  FindingContract,
  P1ExemptionRequest,
  P1ExemptionResponse,
} from '../../../../packages/shared-types/src/finding-contract';

const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  '';
const API = `${API_BASE_URL}/api/v1`;
const RECENT_REQUEST_TTL_MS = 1200;

export type {
  FindingContract,
  P1ExemptionRequest,
  P1ExemptionResponse,
} from '../../../../packages/shared-types/src/finding-contract';

export type {
  ContentIntegrityResult,
  FindingDiffItem,
  FindingDiffResult,
  FormatterIntegrityResult,
  FixJobArtifact,
  FixJobEvent,
  FixResult,
  FixStatusResponse,
  FixStepResult,
  FixType,
  JobError,
  JobRuleDetail,
  JobRuleHitItem as RuleHitItem,
  JobRuleHitLocation as RuleHitLocation,
  PublicJobRecord as JobRecord,
  QueuedJobResponse,
} from '../../../../packages/shared-types/src/job-contract';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  service: string;
  freeFixLimit?: number;
  defaultExecutionModel?: string;
  defaultModelProvider?: string;
  defaultExecutionPermissionMode?: string;
}

export interface DocumentRecord {
  docId: string;
  canonicalDocumentId?: string;
  filename: string;
  size: number;
  sha256: string;
  fileType: string;
  createdAt: string;
}

export interface ProfileRuleEntry {
  ruleId?: string;
  label?: string;
  category?: string;
  categoryCode?: string;
  source?: string;
  thesisSubset?: string;
  targetObject?: string;
  uiSection?: string;
  value?: unknown;
  unit?: string;
  allowedFonts?: string[];
  [key: string]: unknown;
}

export interface SchoolProfile {
  id?: string;
  schoolId?: string;
  name: string;
  faculty?: string;
  match?: number;
  rules?: number;
  version?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  gbVersion?: string;
  sourceType?: string;
  uploadCount?: number;
  recentUsageCount7d?: number;
  recentHitRate7d?: number;
  lastUsedAt?: string | null;
  rulesJson?: ProfileRuleEntry[];
  styleMap?: ProfileRuleEntry[];
}

export interface ProfileSearchResponse {
  profiles: Array<{
    profileId: string;
    schoolName: string;
    version: string;
    ruleCount: number;
    sourceType: string;
  }>;
}

export interface ImportTemplateResult {
  profileId: string;
  ruleCount: number;
  message: string;
}

export interface DiffResult {
  diffs: FindingDiffItem[];
  findingDiffs?: FindingDiffItem[];
  integrity?: FindingDiffResult['integrity'];
  summary: FindingDiffResult['summary'];
}

export interface DuplicationRisk {
  id: string;
  type: 'manual_toc' | 'header_content' | 'reference_format' | 'footnote_format' | 'watermark_text';
  title: string;
  description: string;
  estimatedImpact: number;
  fixable: boolean;
  severity: 'high' | 'medium' | 'low';
}

export type AdminOperation = 'create' | 'read' | 'update' | 'delete';

export interface AdminOperationCapability {
  enabled: boolean;
  label: string;
  endpoint?: string;
  reason?: string;
}

export interface AdminDomainSummary {
  id: string;
  navLabel: string;
  title: string;
  subtitle: string;
  icon: string;
  tables: string[];
  positioning: string;
  lifecycle: string[];
  primaryKey: string;
  operations: Record<AdminOperation, AdminOperationCapability>;
}

export interface AdminRecordRow {
  id: string;
  name: string;
  status: string;
  owner: string;
  evidence: string;
}

export interface AdminOverview {
  domains: AdminDomainSummary[];
  tables: string[];
  flowSteps: string[];
  capabilityTotals: {
    enabled: number;
    total: number;
  };
  tableCounts: Record<string, number>;
}

const FILENAME_MOJIBAKE_PATTERN = /[ÃÂåæçéèêëîïôöùûüÿ¢£¥¤½¼»«�]/;

function normalizeDocumentFilename(filename: string): string {
  const value = String(filename || '').trim();
  if (!value || !FILENAME_MOJIBAKE_PATTERN.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded.includes('\uFFFD') ? value : decoded;
  } catch {
    return value;
  }
}

function normalizeDocumentRecord(record: DocumentRecord): DocumentRecord {
  return {
    ...record,
    filename: normalizeDocumentFilename(record.filename),
  };
}

function normalizeSchoolProfile(record: any): SchoolProfile {
  return {
    id: record.id ?? record.school_id ?? record.schoolId,
    schoolId: record.schoolId ?? record.school_id ?? record.id,
    name: record.name,
    faculty: record.faculty ?? '',
    match: record.match,
    rules: record.rules ?? record.ruleCount ?? (Array.isArray(record.rules_json) ? record.rules_json.length : undefined),
    version: record.version,
    effectiveFrom: record.effectiveFrom ?? record.effective_from,
    effectiveTo: record.effectiveTo ?? record.effective_to ?? null,
    gbVersion: record.gbVersion ?? record.gb_version,
    sourceType: record.sourceType ?? record.source_type,
    uploadCount: record.uploadCount ?? record.upload_count,
    recentUsageCount7d: record.recentUsageCount7d ?? record.recent_usage_count_7d ?? 0,
    recentHitRate7d: record.recentHitRate7d ?? record.recent_hit_rate_7d ?? 0,
    lastUsedAt: record.lastUsedAt ?? record.last_used_at ?? null,
    rulesJson: Array.isArray(record.rulesJson) ? record.rulesJson : (Array.isArray(record.rules_json) ? record.rules_json : []),
    styleMap: Array.isArray(record.styleMap) ? record.styleMap : (Array.isArray(record.style_map) ? record.style_map : []),
  };
}

type RecentRequestEntry<T> = {
  createdAt: number;
  promise: Promise<T>;
};

const recentRequestCache = new Map<string, RecentRequestEntry<unknown>>();

function runRecentRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = recentRequestCache.get(key) as RecentRequestEntry<T> | undefined;
  if (cached && now - cached.createdAt < RECENT_REQUEST_TTL_MS) {
    return cached.promise;
  }

  const promise = factory().finally(() => {
    setTimeout(() => {
      const current = recentRequestCache.get(key);
      if (current?.promise === promise) {
        recentRequestCache.delete(key);
      }
    }, RECENT_REQUEST_TTL_MS);
  });

  recentRequestCache.set(key, { createdAt: now, promise });
  return promise;
}

function clearRecentRequest(prefix: string) {
  for (const key of recentRequestCache.keys()) {
    if (key.startsWith(prefix)) recentRequestCache.delete(key);
  }
}


async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request<HealthResponse>('/health'),

  /** Upload with XHR for real progress tracking. Returns { promise, xhr, abort }. */
  uploadDocument: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    const controller = new AbortController();
    const promise = new Promise<DocumentRecord>((resolve, reject) => {
      // Abort on controller signal
      controller.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Aborted', 'AbortError'));
      });

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(normalizeDocumentRecord(JSON.parse(xhr.responseText)));
        } else {
          try { reject(new Error(JSON.parse(xhr.responseText)?.error?.message || `HTTP ${xhr.status}`)); }
          catch { reject(new Error(`HTTP ${xhr.status}`)); }
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Upload timeout'));
      xhr.timeout = 120000; // 2min timeout
      xhr.open('POST', `${API}/documents/`);
      xhr.send(form);
    });
    return { promise, xhr, abort: () => controller.abort() };
  },

  uploadDocumentSimple: (file: File): Promise<DocumentRecord> => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API}/documents/`, { method: 'POST', body: form }).then(r => {
      if (!r.ok) return r.json().then(b => { throw new Error(b?.error?.message || `HTTP ${r.status}`); });
      return r.json().then(normalizeDocumentRecord);
    });
  },

  searchProfiles: (q?: string): Promise<ProfileSearchResponse> =>
    request('/profiles/search', {
      method: 'POST',
      body: JSON.stringify({ schoolId: q || '' }),
    }),

  getProfile: (id: string): Promise<SchoolProfile> =>
    runRecentRequest(`profile:${id}`, () =>
      request(`/profiles/${id}`).then(normalizeSchoolProfile),
    ),

  importTemplate: (file: File): Promise<ImportTemplateResult> => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API}/profiles/import-template`, { method: 'POST', body: form }).then(r => {
      if (!r.ok) return r.json().then(b => { throw new Error(b?.error?.message || `HTTP ${r.status}`); });
      return r.json();
    });
  },

  createAnalyzeJob: (legacyDocId: string, profileId?: string | null): Promise<QueuedJobResponse> =>
    request('/jobs/analyze', {
      method: 'POST',
      body: JSON.stringify({ docId: legacyDocId, profileId }),
    }),

  createFormatJob: (payload: { legacyDocId?: string; analyzeJobId?: string; profileId: string }): Promise<QueuedJobResponse> =>
    request('/jobs/format', {
      method: 'POST',
      body: JSON.stringify({
        docId: payload.legacyDocId,
        jobId: payload.analyzeJobId,
        profileId: payload.profileId,
      }),
    }),

  getJob: (jobId: string): Promise<JobRecord> =>
    request(`/jobs/${jobId}`),

  getDiff: (diffJobId: string): Promise<DiffResult> =>
    request(`/jobs/${diffJobId}/diff`),

  syncFindings: (payload: { analyzeJobId?: string; canonicalDocumentId: string; findings: FindingContract[] }): Promise<{
    upserted_count: number;
    finding_ids: string[];
  }> => request('/findings/sync', {
    method: 'POST',
    body: JSON.stringify({
      job_id: payload.analyzeJobId,
      document_id: payload.canonicalDocumentId,
      findings: payload.findings,
    }),
  }),

  listFindings: (filter: { canonicalDocumentId?: string; analyzeJobId?: string; status?: string; severity?: string; ruleId?: string; ruleGroup?: string }): Promise<FindingContract[]> => {
    const params = new URLSearchParams();
    if (filter.canonicalDocumentId) params.set('document_id', filter.canonicalDocumentId);
    if (filter.analyzeJobId) params.set('job_id', filter.analyzeJobId);
    if (filter.status) params.set('status', filter.status);
    if (filter.severity) params.set('severity', filter.severity);
    if (filter.ruleId) params.set('rule_id', filter.ruleId);
    if (filter.ruleGroup) params.set('rule_group', filter.ruleGroup);
    const query = params.toString();
    return request(`/findings${query ? `?${query}` : ''}`);
  },

  acceptFinding: (findingId: string): Promise<FindingContract> =>
    request(`/findings/${encodeURIComponent(findingId)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ actor_id: 'local-author', actor_role: 'Author' }),
    }),

  rejectFinding: (findingId: string, reason?: string): Promise<FindingContract> =>
    request(`/findings/${encodeURIComponent(findingId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ actor_id: 'local-author', actor_role: 'Author', reason }),
    }),

  selfEditFinding: (finding: FindingContract, newText: string): Promise<{
    finding: FindingContract;
    affected_finding_ids: string[];
  }> => request(`/findings/${encodeURIComponent(finding.finding_id)}/self-edit`, {
    method: 'POST',
    body: JSON.stringify({
      actor_id: 'local-author',
      new_text: newText,
      affected_spans: finding.evidence_spans,
    }),
  }),

  exemptP1Findings: (payload: P1ExemptionRequest): Promise<P1ExemptionResponse> =>
    request('/findings/exempt-p1', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDownload: (downloadJobId: string): Promise<Blob> =>
    fetch(`${API}/jobs/${downloadJobId}/download`).then(r => {
      if (!r.ok) throw new Error(`Download failed: HTTP ${r.status}`);
      return r.blob();
    }),

  getDownloadUrl: (downloadJobId: string, type?: string) =>
    `${API}/jobs/${downloadJobId}/download${type ? `?type=${type}` : ''}`,

  // ── 02 Fix Matrix API ──
  createFixJob: (payload: { legacyDocId?: string; sourceJobId?: string; profileId: string; selectedFixes?: FixType[] }): Promise<QueuedJobResponse> =>
    request('/jobs/fix', {
      method: 'POST',
      body: JSON.stringify({
        docId: payload.legacyDocId,
        jobId: payload.sourceJobId,
        profileId: payload.profileId,
        selectedFixes: payload.selectedFixes,
      }),
    }),

  getFixStatus: (fixJobId: string): Promise<FixStatusResponse> =>
    request(`/jobs/${fixJobId}/fix-status`),

  // ── 05 Share API ──
  createShareReport: (legacyDocId: string): Promise<{
    shareUrl: string;
    shareTitle: string;
    shareDesc: string;
    ogImageUrl: string;
    posterUrl?: string;
  }> => request('/share/report', { method: 'POST', body: JSON.stringify({ fileId: legacyDocId, checkResultId: legacyDocId }) }),

  getShareReport: (shareId: string): Promise<{
    score: number;
    totalIssues: number;
    fixableIssues: number;
    topIssues: { title: string; severity: string }[];
    schoolName: string;
    collegeName: string;
    totalUsers: number;
    totalSchools: number;
  }> => request(`/share/report/${shareId}`),

  // ── School Detection API ──
  detectSchool: (legacyDocId: string): Promise<{
    detected: boolean;
    name: string | null;
    confidence: number;
    matchedText?: string;
    existingSchoolId: string | null;
  }> => runRecentRequest(`detect:${legacyDocId}`, () =>
    request('/profiles/detect', {
      method: 'POST',
      body: JSON.stringify({ docId: legacyDocId }),
    }),
  ),

  autoCreateSchool: (name: string, legacyDocId: string): Promise<{
    schoolId: string;
    name: string;
    version: string;
    isNew: boolean;
  }> => request<{
    schoolId: string;
    name: string;
    version: string;
    isNew: boolean;
  }>('/profiles/auto-create', {
    method: 'POST',
    body: JSON.stringify({ name, docId: legacyDocId }),
  }).then((result) => {
    clearRecentRequest('profiles:');
    clearRecentRequest(`detect:${legacyDocId}`);
    return result;
  }),

  listProfiles: (q?: string): Promise<{
    profiles: Array<{
      schoolId: string;
      name: string;
      faculty: string;
      version: string;
      effectiveFrom?: string;
      ruleCount: number;
      uploadCount: number;
      recentUsageCount7d?: number;
      recentHitRate7d?: number;
      lastUsedAt?: string | null;
      sourceType: string;
    }>;
  }> => runRecentRequest(`profiles:${q || 'all'}`, () =>
    request('/profiles' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  ),

  adminOverview: (): Promise<AdminOverview> =>
    request('/admin/overview'),

  adminDomainRecords: (domainId: string, filter?: { search?: string; limit?: number }): Promise<{
    domain: AdminDomainSummary;
    records: AdminRecordRow[];
  }> => {
    const params = new URLSearchParams();
    if (filter?.search) params.set('search', filter.search);
    if (filter?.limit) params.set('limit', String(filter.limit));
    const query = params.toString();
    return request(`/admin/domains/${encodeURIComponent(domainId)}/records${query ? `?${query}` : ''}`);
  },

  adminAuditRecords: (filter?: { search?: string; limit?: number }): Promise<{
    records: AdminRecordRow[];
  }> => {
    const params = new URLSearchParams();
    if (filter?.search) params.set('search', filter.search);
    if (filter?.limit) params.set('limit', String(filter.limit));
    const query = params.toString();
    return request(`/admin/audit-records${query ? `?${query}` : ''}`);
  },
};
