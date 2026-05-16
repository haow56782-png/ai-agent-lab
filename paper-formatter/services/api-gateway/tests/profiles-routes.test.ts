import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileRoutes } from "../src/routes/profiles.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import * as profileRepo from "../src/repositories/profiles.js";
import * as docRepo from "../src/repositories/documents.js";
import * as storage from "../src/storage.js";
import { query } from "../src/db.js";
import { redisDel, redisGet, redisSetEx } from "../src/redis.js";

vi.mock("../src/repositories/profiles.js", () => ({
  searchProfiles: vi.fn(),
  getProfile: vi.fn(),
  listProfiles: vi.fn(),
  findBestProfileByName: vi.fn(),
  findProfileByName: vi.fn(),
  incrementUploadCount: vi.fn(),
  createProfile: vi.fn(),
}));

vi.mock("../src/repositories/documents.js", () => ({
  getDocument: vi.fn(),
}));

vi.mock("../src/storage.js", () => ({
  getStoragePath: vi.fn(() => "uploads/doc/file.docx"),
  downloadFile: vi.fn(),
}));

vi.mock("../src/db.js", () => ({
  query: vi.fn(),
}));

vi.mock("../src/redis.js", () => ({
  redisGet: vi.fn(),
  redisSetEx: vi.fn(),
  redisDel: vi.fn(),
}));

vi.mock("child_process", () => ({
  spawnSync: vi.fn(() => ({
    stdout: JSON.stringify({
      detected: true,
      name: "南开大学",
      confidence: 0.96,
      matched_text: "南开大学",
    }),
  })),
}));

describe("profile routes canonical mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redisGet).mockResolvedValue(null as any);
    vi.mocked(redisSetEx).mockResolvedValue(undefined as any);
    vi.mocked(redisDel).mockResolvedValue(undefined as any);
    vi.mocked(query).mockResolvedValue({ rows: [] } as any);
  });

  async function request(path: string, init?: { method?: string; body?: Record<string, unknown> }) {
    return new Promise<{ response: { status: number }; body: any }>((resolve, reject) => {
      const strippedPath = path.replace(/^\/profiles(?=\/|\?|$)/, "") || "/";
      const req: any = {
        method: init?.method ?? "GET",
        url: strippedPath,
        originalUrl: path,
        headers: { "content-type": "application/json" },
        body: init?.body,
        query: Object.fromEntries(new URL(`http://local.test${path}`).searchParams.entries()),
      };
      const res: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: unknown) {
          resolve({ response: { status: this.statusCode }, body: payload });
          return this;
        },
        send(payload: unknown) {
          resolve({ response: { status: this.statusCode }, body: payload });
          return this;
        },
        setHeader: vi.fn(),
      };
      profileRoutes.handle(req, res, (err: unknown) => {
        if (!err) {
          resolve({ response: { status: 404 }, body: { error: { message: "Not found" } } });
          return;
        }
        errorHandler(err as Error, req, res, reject);
      });
    });
  }

  it("detect returns canonical existingSchoolId instead of creating a shell profile id", async () => {
    vi.mocked(docRepo.getDocument).mockResolvedValue({
      doc_id: "doc_885227a3",
      canonical_document_id: "11111111-1111-4111-8111-111111111111",
      filename: "兰州大学本科生论文.docx",
      size_bytes: 4096,
      sha256: "a".repeat(64),
      file_type: "docx",
      page_count: 15,
      is_scanned_pdf: false,
      created_at: "2026-05-13T00:00:00.000Z",
    } as any);
    vi.mocked(storage.downloadFile).mockResolvedValue(Buffer.from("docx"));
    vi.mocked(profileRepo.findBestProfileByName).mockResolvedValue({
      school_id: "nku",
      name: "南开大学",
      version: "v2026.05",
    } as any);

    const { response, body } = await request("/profiles/detect", {
      method: "POST",
      body: { docId: "doc_885227a3" },
    });

    expect(response.status).toBe(200);
    expect(profileRepo.findBestProfileByName).toHaveBeenCalledWith("南开大学");
    expect(body).toMatchObject({
      detected: true,
      name: "南开大学",
      existingSchoolId: "nku",
    });
  });

  it("auto-create reuses a canonical profile instead of inserting sch_* shell rows", async () => {
    vi.mocked(profileRepo.findBestProfileByName).mockResolvedValue({
      school_id: "nku",
      name: "南开大学",
      version: "v2026.05",
    } as any);

    const { response, body } = await request("/profiles/auto-create", {
      method: "POST",
      body: { name: "南开大学", docId: "doc_1" },
    });

    expect(response.status).toBe(200);
    expect(profileRepo.createProfile).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      `INSERT INTO document_profiles (doc_id, school_id, profile_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      ["doc_1", "nku", "nku"],
    );
    expect(profileRepo.incrementUploadCount).toHaveBeenCalledWith("nku");
    expect(body).toEqual({
      schoolId: "nku",
      name: "南开大学",
      version: "v2026.05",
      isNew: false,
    });
  });

  it("list exposes recent usage stats for Step2 ordering", async () => {
    vi.mocked(profileRepo.listProfiles).mockResolvedValue([
      {
        school_id: "nku",
        name: "南开大学",
        faculty: "经济学院",
        version: "v2026.05",
        effective_from: "2026-05-01",
        rules_json: [{ ruleId: "margin_top_mm" }],
        style_map: [{ ruleId: "body_fonts" }],
        upload_count: 9,
        recent_usage_count_7d: 4,
        recent_hit_rate_7d: 0.5,
        last_used_at: "2026-05-14T08:00:00.000Z",
        source_type: "seed",
      } as any,
    ]);

    const { response, body } = await request("/profiles");

    expect(response.status).toBe(200);
    expect(body).toEqual({
      profiles: [
        {
          schoolId: "nku",
          name: "南开大学",
          faculty: "经济学院",
          version: "v2026.05",
          effectiveFrom: "2026-05-01",
          ruleCount: 1,
          uploadCount: 9,
          recentUsageCount7d: 4,
          recentHitRate7d: 0.5,
          lastUsedAt: "2026-05-14T08:00:00.000Z",
          sourceType: "seed",
        },
      ],
    });
  });
});
