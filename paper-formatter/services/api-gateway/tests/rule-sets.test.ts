import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSchoolRuleRows,
  createAnalyzeRuleSnapshotsForFindings,
  createRuleSnapshot,
  getProfileRulePayloadFromRuleTable,
  upsertRuleSetFromProfile,
} from "../src/repositories/rule-sets.js";
import { query } from "../src/db.js";

const client = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock("../src/db.js", () => ({
  query: vi.fn(),
  getPool: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(client),
  })),
}));

describe("school rule-set repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.query.mockReset();
    client.release.mockReset();
  });

  it("normalizes profile JSON cache entries into indexed school_rule rows", () => {
    const rows = buildSchoolRuleRows({
      schoolId: "nku",
      schoolName: "南开大学",
      version: "v2026.05",
      effectiveFrom: "2026-05-01",
      rulesJson: [
        {
          ruleId: "canonical_toc_05",
          label: "目录条目页码右对齐",
          description: "目录条目页码右对齐，并使用点线前导符连接标题",
          type: "structure",
          source: "school",
          category: "08. 目录",
          categoryCode: "08",
          thesisSubset: "toc",
          targetObject: "目录正文",
          uiSection: "目录",
        },
      ],
      styleMap: [
        {
          ruleId: "body_fonts",
          label: "正文字体",
          allowedFonts: ["宋体", "Times New Roman"],
          category: "10. 正文段落",
          categoryCode: "10",
          thesisSubset: "paragraph",
          targetObject: "正文段落",
          uiSection: "正文",
        },
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      schoolId: "nku",
      ruleId: "canonical_toc_05",
      ruleType: "structure",
      thesisSubset: "toc",
      targetObject: "目录正文",
      expectedFormatJson: {
        description: "目录条目页码右对齐，并使用点线前导符连接标题",
      },
      conflictPolicy: "warn_on_conflict",
      fixable: true,
    });
    expect(rows[1].expectedFormatJson).toMatchObject({
      allowedFonts: ["宋体", "Times New Roman"],
    });
  });

  it("upserts one rule set and materializes each rule as a first-class table row", async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ rule_set_id: "rule-set-1" }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const result = await upsertRuleSetFromProfile({
      schoolId: "nku",
      schoolName: "南开大学",
      version: "v2026.05",
      effectiveFrom: "2026-05-01",
      rulesJson: [
        {
          ruleId: "canonical_toc_06",
          label: "目录页自身不显示正文页码",
          description: "目录页自身不显示正文页码",
          category: "08. 目录",
          categoryCode: "08",
          thesisSubset: "toc",
          targetObject: "目录正文",
          uiSection: "目录",
        },
      ],
      styleMap: [],
    });

    expect(result).toEqual({ ruleSetId: "rule-set-1", ruleCount: 1 });
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO school_rule_sets"), expect.any(Array));
    expect(client.query).toHaveBeenCalledWith("DELETE FROM school_rules WHERE rule_set_id = $1", ["rule-set-1"]);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO school_rules"), expect.arrayContaining([
      "rule-set-1",
      "nku",
      "canonical_toc_06",
      "目录页自身不显示正文页码",
    ]));
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  it("aggregates profile detail payload from school_rules instead of treating JSONB as the fact source", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ rule_set_id: "rs_nku", school_id: "nku", version: "v2026.05" }] } as any)
      .mockResolvedValueOnce({
        rows: [
          {
            cache_kind: "rule",
            raw_rule_json: { ruleId: "canonical_toc_05", description: "目录条目页码右对齐，并使用点线前导符连接标题" },
          },
          {
            cache_kind: "style",
            raw_rule_json: { ruleId: "body_fonts", allowedFonts: ["宋体", "Times New Roman"] },
          },
        ],
      } as any);

    const payload = await getProfileRulePayloadFromRuleTable("nku");

    expect(payload).toEqual({
      ruleSetId: "rs_nku",
      rulesJson: [{ ruleId: "canonical_toc_05", description: "目录条目页码右对齐，并使用点线前导符连接标题" }],
      styleMap: [{ ruleId: "body_fonts", allowedFonts: ["宋体", "Times New Roman"] }],
    });
  });

  it("creates immutable rule snapshots for analyze findings", async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ snapshot_id: "snap_1" }] } as any);

    const snapshotId = await createRuleSnapshot({
      documentId: "doc-canonical-1",
      jobId: "job_analyze_1",
      findingId: "finding_1",
      schoolId: "nku",
      ruleSetId: "rs_nku",
      ruleId: "canonical_toc_05",
      rulePayload: { ruleId: "canonical_toc_05", description: "目录条目页码右对齐，并使用点线前导符连接标题" },
      snapshotContext: "analyze",
    });

    expect(snapshotId).toBe("snap_1");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO rule_snapshots"),
      [
        "doc-canonical-1",
        "job_analyze_1",
        "finding_1",
        "nku",
        "rs_nku",
        "canonical_toc_05",
        JSON.stringify({ ruleId: "canonical_toc_05", description: "目录条目页码右对齐，并使用点线前导符连接标题" }),
        "analyze",
      ],
    );
  });

  it("creates analyze snapshots from persisted school_rules when findings are written", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ rule_set_id: "rs_nku", school_id: "nku", version: "v2026.05" }] } as any)
      .mockResolvedValueOnce({ rows: [{ rule_set_id: "rs_nku", school_id: "nku", version: "v2026.05" }] } as any)
      .mockResolvedValueOnce({
        rows: [
          {
            rule_id: "canonical_toc_05",
            raw_rule_json: { ruleId: "canonical_toc_05", description: "目录条目页码右对齐" },
          },
        ],
      } as any)
      .mockResolvedValueOnce({ rows: [{ snapshot_id: "snap_1" }] } as any);

    const snapshotIds = await createAnalyzeRuleSnapshotsForFindings({
      schoolId: "nku",
      documentId: "doc-canonical-1",
      jobId: "job_analyze_1",
      findings: [
        {
          finding_id: "finding_1",
          document_id: "doc-canonical-1",
          document_version: 1,
          rule_id: "canonical_toc_05",
          rule_group: "目录",
          rule_snapshot: {
            rule_text: "目录条目页码右对齐",
            rule_version: "nku",
            rule_description: "目录条目页码右对齐",
          },
          severity: "P2",
          confidence: 0.91,
          evidence_spans: [],
          evidence_snapshot: "目录页码未右对齐",
          cross_page: false,
          is_global: false,
          suggestion: {
            type: "replace",
            explanation: "按学校目录规则调整",
          },
          status: "pending",
          created_at: "2026-05-14T00:00:00.000Z",
          updated_at: "2026-05-14T00:00:00.000Z",
          audit_trail: [],
        },
      ],
    });

    expect(snapshotIds).toEqual(["snap_1"]);
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO rule_snapshots"),
      [
        "doc-canonical-1",
        "job_analyze_1",
        "finding_1",
        "nku",
        "rs_nku",
        "canonical_toc_05",
        JSON.stringify({ ruleId: "canonical_toc_05", description: "目录条目页码右对齐" }),
        "analyze",
      ],
    );
  });

  it("makes non-canonical profile rule snapshot fallback explicit when school_rules are missing", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ rule_set_id: "rs_legacy", school_id: "legacy", version: "vAuto" }] } as any)
      .mockResolvedValueOnce({ rows: [{ rule_set_id: "rs_legacy", school_id: "legacy", version: "vAuto" }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ snapshot_id: "snap_fallback" }] } as any);

    const snapshotIds = await createAnalyzeRuleSnapshotsForFindings({
      schoolId: "legacy",
      documentId: "doc-canonical-1",
      jobId: "job_analyze_1",
      findings: [
        {
          finding_id: "finding_legacy_1",
          document_id: "doc-canonical-1",
          document_version: 1,
          rule_id: "REFERENCE_MISSING_DOI",
          rule_group: "参考文献",
          rule_snapshot: {
            rule_text: "缺 DOI",
            rule_version: "legacy",
            rule_description: "参考文献 DOI 缺失",
          },
          severity: "P2",
          confidence: 0.91,
          evidence_spans: [
            {
              page: 1,
              char_start: 0,
              char_end: 4,
              snippet: "参考文献",
              metadata: {
                canonicalMapping: {
                  detectorRuleId: "REFERENCE_MISSING_DOI",
                  canonicalRuleId: "canonical_reference_06",
                  resolvedRuleId: "REFERENCE_MISSING_DOI",
                  status: "missing_profile_rule",
                  reason: "Selected profile does not include canonical school rule canonical_reference_06",
                },
              },
            },
          ],
          evidence_snapshot: "参考文献 DOI 缺失",
          cross_page: false,
          is_global: false,
          suggestion: {
            type: "manual_only",
            explanation: "补齐 DOI",
          },
          status: "pending",
          created_at: "2026-05-14T00:00:00.000Z",
          updated_at: "2026-05-14T00:00:00.000Z",
          audit_trail: [],
        },
      ],
    });

    expect(snapshotIds).toEqual(["snap_fallback"]);
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO rule_snapshots"),
      [
        "doc-canonical-1",
        "job_analyze_1",
        "finding_legacy_1",
        "legacy",
        "rs_legacy",
        "REFERENCE_MISSING_DOI",
        JSON.stringify({
          ruleId: "REFERENCE_MISSING_DOI",
          ruleSnapshot: {
            rule_text: "缺 DOI",
            rule_version: "legacy",
            rule_description: "参考文献 DOI 缺失",
          },
          source: "finding_contract",
          fallbackReason: "missing_profile_rule",
          fallbackMessage: "Selected profile does not include canonical school rule canonical_reference_06",
          canonicalMapping: {
            detectorRuleId: "REFERENCE_MISSING_DOI",
            canonicalRuleId: "canonical_reference_06",
            resolvedRuleId: "REFERENCE_MISSING_DOI",
            status: "missing_profile_rule",
            reason: "Selected profile does not include canonical school rule canonical_reference_06",
          },
        }),
        "analyze",
      ],
    );
  });

  it("defines normalized rule-set, rule, and snapshot tables with lookup indexes", () => {
    const dbSource = readFileSync(path.resolve(import.meta.dirname, "../src/db.ts"), "utf-8");

    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS school_rule_sets");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS school_rules");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS rule_snapshots");
    expect(dbSource).toContain("UNIQUE (school_id, version)");
    expect(dbSource).toContain("UNIQUE (rule_set_id, rule_id)");
    expect(dbSource).toContain("idx_school_rules_subset");
    expect(dbSource).toContain("idx_school_rules_target");
    expect(dbSource).toContain("idx_rule_snapshots_document");
  });
});
