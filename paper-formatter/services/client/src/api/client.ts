const API = '/api/v1';

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
  filename: string;
  size: number;
  sha256: string;
  fileType: string;
  createdAt: string;
}

export interface RuleHitLocation {
  pageIndex: number; // 0-based
  bbox?: { x: number; y: number; w: number; h: number };
}

export interface RuleHitItem {
  ruleId?: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  location?: RuleHitLocation;
}

export interface JobRecord {
  jobId: string;
  type?: string;
  status: string;
  progress: number;
  stage?: string;
  docId?: string;
  profileId?: string;
  result?: {
    items?: { k: string; conf: number }[];
    log?: string[];
    rules?: { passed: number; warnings: number; failed: number };
    ruleDetails?: { cat: string; items: (RuleHitItem | [string, 'pass' | 'warn'])[] }[];
    [key: string]: unknown;
  };
  createdAt: string;
  completedAt?: string;
  estimatedSeconds?: number;
  freeFixLimit?: number;
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

// ── 02 Fix Matrix types ──
export type FixType = 'margin' | 'body_style' | 'heading' | 'page_number' | 'cover' | 'toc' | 'duplication_preprocess' | 'header_footer' | 'abstract_format' | 'cross_ref' | 'caption' | 'reference_format' | 'table_format' | 'image_format' | 'punctuation';

export interface DuplicationRisk {
  id: string;
  type: 'manual_toc' | 'header_content' | 'reference_format' | 'footnote_format' | 'watermark_text';
  title: string;
  description: string;
  estimatedImpact: number;
  fixable: boolean;
  severity: 'high' | 'medium' | 'low';
}

export interface FixStepResult {
  type: FixType;
  status: 'done' | 'skipped' | 'failed';
  summary: string;
  duration: number;
}

export interface FixStatusResponse {
  status: 'running' | 'done' | 'failed';
  completedSteps: FixStepResult[];
  currentStep?: FixType;
  progress: number;
  stage?: string;
  message?: string;
  errorMessage?: string;
  freeFixLimit?: number;
  result?: FixResult;
}

export interface FixResult {
  fixedFileId: string;
  totalFixed: number;
  newScore: number;
  contentHash: string;
  originalHash: string;
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

  createAnalyzeJob: (docId: string, profileId?: string | null): Promise<JobRecord> =>
    request('/jobs/analyze', {
      method: 'POST',
      body: JSON.stringify({ docId, profileId }),
    }),

  createFormatJob: (payload: { docId?: string; jobId?: string; profileId: string }): Promise<JobRecord> =>
    request('/jobs/format', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getJob: (jobId: string): Promise<JobRecord> =>
    request(`/jobs/${jobId}`),

  getDiff: (jobId: string): Promise<DiffResult> =>
    request(`/jobs/${jobId}/diff`),

  getDownload: (jobId: string): Promise<Blob> =>
    fetch(`${API}/jobs/${jobId}/download`).then(r => {
      if (!r.ok) throw new Error(`Download failed: HTTP ${r.status}`);
      return r.blob();
    }),

  getDownloadUrl: (jobId: string, type?: string) =>
    `${API}/jobs/${jobId}/download${type ? `?type=${type}` : ''}`,

  // ── 02 Fix Matrix API ──
  createFixJob: (payload: { docId?: string; jobId?: string; profileId: string; selectedFixes?: FixType[] }): Promise<JobRecord> =>
    request('/jobs/fix', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getFixStatus: (jobId: string): Promise<FixStatusResponse> =>
    request(`/jobs/${jobId}/fix-status`),

  // ── 05 Share API ──
  createShareReport: (fileId: string): Promise<{
    shareUrl: string;
    shareTitle: string;
    shareDesc: string;
    ogImageUrl: string;
    posterUrl?: string;
  }> => request('/share/report', { method: 'POST', body: JSON.stringify({ fileId, checkResultId: fileId }) }),

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
  detectSchool: (docId: string): Promise<{
    detected: boolean;
    name: string | null;
    confidence: number;
    matchedText?: string;
    existingSchoolId: string | null;
  }> => request('/profiles/detect', {
    method: 'POST',
    body: JSON.stringify({ docId }),
  }),

  autoCreateSchool: (name: string, docId: string): Promise<{
    schoolId: string;
    name: string;
    version: string;
    isNew: boolean;
  }> => request('/profiles/auto-create', {
    method: 'POST',
    body: JSON.stringify({ name, docId }),
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
