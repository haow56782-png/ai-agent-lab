import type {
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

const API = '/api/v1';

export type {
  FindingContract,
  P1ExemptionRequest,
  P1ExemptionResponse,
} from '../../../../packages/shared-types/src/finding-contract';

export type {
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

export interface SchoolProfile {
  id: string;
  name: string;
  faculty?: string;
  match?: number;
  rules?: number;
  version?: string;
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
  diffs: { page: number; type: string; element: string; original: string; modified: string; position: string }[];
  summary: { pages: number; changeCount: number; contentChanges: number; formatChanges: number };
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
          resolve(JSON.parse(xhr.responseText));
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
      return r.json();
    });
  },

  searchProfiles: (q?: string): Promise<ProfileSearchResponse> =>
    request('/profiles/search', {
      method: 'POST',
      body: JSON.stringify({ schoolId: q || '' }),
    }),

  getProfile: (id: string): Promise<SchoolProfile> =>
    request(`/profiles/${id}`),

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

  createFormatJob: (payload: { legacyDocId?: string; jobId?: string; profileId: string }): Promise<QueuedJobResponse> =>
    request('/jobs/format', {
      method: 'POST',
      body: JSON.stringify({
        docId: payload.legacyDocId,
        jobId: payload.jobId,
        profileId: payload.profileId,
      }),
    }),

  getJob: (jobId: string): Promise<JobRecord> =>
    request(`/jobs/${jobId}`),

  getDiff: (jobId: string): Promise<DiffResult> =>
    request(`/jobs/${jobId}/diff`),

  syncFindings: (payload: { jobId?: string; canonicalDocumentId: string; findings: FindingContract[] }): Promise<{
    upserted_count: number;
    finding_ids: string[];
  }> => request('/findings/sync', {
    method: 'POST',
    body: JSON.stringify({
      job_id: payload.jobId,
      document_id: payload.canonicalDocumentId,
      findings: payload.findings,
    }),
  }),

  listFindings: (filter: { canonicalDocumentId?: string; jobId?: string; status?: string; severity?: string; ruleId?: string; ruleGroup?: string }): Promise<FindingContract[]> => {
    const params = new URLSearchParams();
    if (filter.canonicalDocumentId) params.set('document_id', filter.canonicalDocumentId);
    if (filter.jobId) params.set('job_id', filter.jobId);
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

  getDownload: (jobId: string): Promise<Blob> =>
    fetch(`${API}/jobs/${jobId}/download`).then(r => {
      if (!r.ok) throw new Error(`Download failed: HTTP ${r.status}`);
      return r.blob();
    }),

  getDownloadUrl: (jobId: string, type?: string) =>
    `${API}/jobs/${jobId}/download${type ? `?type=${type}` : ''}`,

  // ── 02 Fix Matrix API ──
  createFixJob: (payload: { legacyDocId?: string; jobId?: string; profileId: string; selectedFixes?: FixType[] }): Promise<QueuedJobResponse> =>
    request('/jobs/fix', {
      method: 'POST',
      body: JSON.stringify({
        docId: payload.legacyDocId,
        jobId: payload.jobId,
        profileId: payload.profileId,
        selectedFixes: payload.selectedFixes,
      }),
    }),

  getFixStatus: (jobId: string): Promise<FixStatusResponse> =>
    request(`/jobs/${jobId}/fix-status`),

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
  }> => request('/profiles/detect', {
    method: 'POST',
    body: JSON.stringify({ docId: legacyDocId }),
  }),

  autoCreateSchool: (name: string, legacyDocId: string): Promise<{
    schoolId: string;
    name: string;
    version: string;
    isNew: boolean;
  }> => request('/profiles/auto-create', {
    method: 'POST',
    body: JSON.stringify({ name, docId: legacyDocId }),
  }),

  listProfiles: (q?: string): Promise<{
    profiles: Array<{
      schoolId: string;
      name: string;
      faculty: string;
      version: string;
      ruleCount: number;
      uploadCount: number;
      sourceType: string;
    }>;
  }> => request('/profiles' + (q ? `?q=${encodeURIComponent(q)}` : '')),
};
