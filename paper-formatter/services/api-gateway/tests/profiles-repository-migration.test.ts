import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("profiles repository migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.query.mockReset();
    client.release.mockReset();
  });

  it("migrates legacy detected shells into canonical profiles and archives the shells", async () => {
    const profilesRepo = await import("../src/repositories/profiles.js");

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            school_id: "sch_968b5891",
            name: "南开大学",
            source_type: "detected",
            upload_count: 11,
            updated_at: "2026-05-13T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            school_id: "nku",
            name: "南开大学",
            source_type: "seed",
            upload_count: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { doc_id: "doc_1", confidence: 0.88 },
          { doc_id: "doc_2", confidence: 0.91 },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await profilesRepo.migrateLegacyDetectedProfiles();

    expect(result).toEqual({
      migratedProfiles: 1,
      migratedDocumentLinks: 2,
    });
    expect(client.query).toHaveBeenCalledWith(
      `UPDATE school_profiles
            SET source_type = $2,
                upload_count = 0,
                updated_at = NOW()
          WHERE school_id = $1`,
      ["sch_968b5891", "archived_detected"],
    );
    expect(client.release).toHaveBeenCalled();
  });

  it("archives invalid detected placeholder names even when no canonical school exists", async () => {
    const profilesRepo = await import("../src/repositories/profiles.js");

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            school_id: "sch_bad_placeholder",
            name: "学生所属学院",
            source_type: "detected",
            upload_count: 3,
            updated_at: "2026-05-13T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await profilesRepo.migrateLegacyDetectedProfiles();

    expect(result).toEqual({
      migratedProfiles: 1,
      migratedDocumentLinks: 0,
    });
    expect(client.query).toHaveBeenCalledWith(
      `UPDATE school_profiles
              SET source_type = $2,
                  upload_count = 0,
                  updated_at = NOW()
            WHERE school_id = $1`,
      ["sch_bad_placeholder", "archived_detected"],
    );
  });

  it("normalizes canonical manual profiles into seed source_type", async () => {
    const profilesRepo = await import("../src/repositories/profiles.js");
    const seed = {
      schoolId: "thu",
      name: "清华大学",
      faculty: "计算机科学与技术系",
      version: "v2024.09",
      effectiveFrom: "2024-01-01",
      aliases: ["清华大学"],
      rulesJson: [{ ruleId: "margin_top_mm", label: "上边距", value: 25, unit: "mm" }],
      styleMap: [{ ruleId: "body_fonts", label: "正文字体", allowedFonts: ["宋体"] }],
    };

    vi.mocked(query)
      .mockResolvedValueOnce({
        rows: [
          {
            school_id: "thu",
            name: "清华大学",
            source_type: "manual",
            rules_json: [{ ruleId: "legacy_rule" }],
            style_map: [{ ruleId: "legacy_style" }],
            version: "v2024.09",
            effective_from: "2024-01-01",
            faculty: "计算机科学与技术系",
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        rows: [
          {
            school_id: "thu",
            source_type: "seed",
            name: "清华大学",
            source_hash: null,
          },
        ],
      } as any);

    client.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ rule_set_id: "rs_thu_v2024" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined);

    const result = await profilesRepo.ensureCanonicalProfile(seed as any);

    expect(query).toHaveBeenCalledWith(
      `UPDATE school_profiles
          SET name = $2,
              version = $3,
              effective_from = $4,
              faculty = COALESCE(faculty, $5),
              rules_json = $6::jsonb,
              style_map = $7::jsonb,
              source_type = CASE WHEN source_type IN ('detected', 'manual') THEN 'seed' ELSE source_type END,
              updated_at = NOW()
        WHERE school_id = $1
        RETURNING *`,
      [
        "thu",
        "清华大学",
        "v2024.09",
        "2024-01-01",
        "计算机科学与技术系",
        JSON.stringify(seed.rulesJson),
        JSON.stringify(seed.styleMap),
      ],
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO school_rule_sets"),
      expect.arrayContaining(["thu", "清华大学", "v2024.09"]),
    );
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(result).toMatchObject({ school_id: "thu", source_type: "seed" });
  });
});
