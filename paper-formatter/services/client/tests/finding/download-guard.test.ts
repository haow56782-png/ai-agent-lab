// Download guard boundary tests live outside the Phase 1 finding contract suite.
// They verify shared download eligibility behavior without touching UI or API code.
// This keeps Phase 1 focused on schema, adapter, store, selectors, status, and rule resolver.
import assert from 'node:assert/strict';
import { canDownloadByFindings } from '../../../../packages/shared-types/src/finding-download-guard.ts';

const now = '2026-05-11T00:00:00.000Z';

function testDownloadGuard() {
  const pendingP0 = {
    finding_id: 'finding-p0',
    severity: 'P0',
    status: 'pending',
  } as const;
  const pendingP1 = {
    finding_id: 'finding-p1',
    severity: 'P1',
    status: 'pending',
  } as const;

  assert.equal(canDownloadByFindings({ jobStatus: 'processing', findings: [] }).allowed, false);
  assert.equal(canDownloadByFindings({ jobStatus: 'completed', findings: [pendingP0] }).reasons.includes('P0_PENDING'), true);
  assert.equal(canDownloadByFindings({ jobStatus: 'completed', findings: [pendingP1] }).allowed, false);
  assert.equal(canDownloadByFindings({
    jobStatus: 'completed',
    findings: [pendingP1],
    p1Exemption: {
      exempted_finding_ids: ['finding-p1'],
      actor_id: 'author',
      actor_role: 'Author',
      reason: '作者已签字承担该 P1 风险。',
      acknowledged: true,
      timestamp: now,
    },
  }).allowed, true);
}

testDownloadGuard();
console.log('Finding download guard tests passed');
