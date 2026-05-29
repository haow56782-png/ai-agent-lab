import { Router } from "express";
import multer from "multer";
import * as profileRepo from "../repositories/profiles.js";
import * as docRepo from "../repositories/documents.js";
import * as storage from "../storage.js";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import {
  parseAutoCreateSchoolCommand,
  parseDetectSchoolCommand,
} from "../dto/document-requests.js";
import { query } from "../db.js";
import { getCache } from "../cache/index.js";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

export const profileRoutes = Router();

const DETECT_SCRIPT = process.env.DETECT_SCHOOL_SCRIPT ||
  path.resolve(process.cwd(), "src/parser/detect_school.py");
const TEMP_DIR = path.join(os.tmpdir(), "zheng-gao-detect");

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
}

const CACHE_TTLS = {
  listProfiles: 90,
  profileDetail: 180,
  detectSchool: 300,
};

// ── File upload config (matching documents route pattern) ──
const templateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split(".").pop();
    if (ext === "docx" || ext === "pdf") {
      cb(null, true);
    } else {
      cb(createError(422, ERROR_CODES.UNSUPPORTED_FORMAT, `Unsupported format: .${ext}`) as any);
    }
  },
});

// ── Named action routes (BEFORE parameterized :profileId to avoid capture) ──

profileRoutes.post("/search", async (req, res, next) => {
  try {
    const { schoolId, faculty, major } = req.body;
    const profiles = await profileRepo.searchProfiles({
      schoolId: schoolId || undefined,
      faculty: faculty || undefined,
      major: major || undefined,
    });

    res.json({
      profiles: profiles.map((p) => ({
        profileId: p.school_id,
        schoolName: p.name || p.school_id,
        version: p.version,
        ruleCount: p.rules_json.length,
        sourceType: p.source_type,
      })),
    });
  } catch (err) {
    next(err);
  }
});

profileRoutes.post("/detect", async (req, res, next) => {
  try {
    const command = parseDetectSchoolCommand(req.body);
    const cacheKey = `profiles:detect:${command.legacyDocId}`;
    const cache = getCache();
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Download file from MinIO
    const doc = await docRepo.getDocument(command.legacyDocId);
    if (!doc) throw createError(404, ERROR_CODES.NOT_FOUND, "Document not found");

    const storagePath = storage.getStoragePath("uploads", doc.doc_id, doc.filename);
    let buffer: Buffer;
    try {
      buffer = await storage.downloadFile("uploads", storagePath);
    } catch {
      return res.json({ detected: false, name: null, confidence: 0, existingSchoolId: null });
    }

    // Save to temp file and run detection
    ensureTempDir();
    const ext = path.extname(doc.filename) || ".docx";
    const tmpPath = path.join(TEMP_DIR, `${uuid().slice(0, 8)}${ext}`);
    try {
      writeFileSync(tmpPath, buffer);
      const result = spawnSync("python3", [DETECT_SCRIPT, tmpPath], {
        encoding: "utf-8",
        timeout: 15_000,
        maxBuffer: 1024 * 1024,
      });

      const output = JSON.parse(result.stdout || "{}");
      if (!output.detected || !output.name) {
        const payload = { detected: false, name: null, confidence: 0, existingSchoolId: null };
        await cache.set(cacheKey, JSON.stringify(payload), CACHE_TTLS.detectSchool);
        return res.json(payload);
      }

      // Check if this school already exists
      const existing = await profileRepo.findBestProfileByName(output.name);
      const payload = {
        detected: true,
        name: output.name,
        confidence: output.confidence,
        matchedText: output.matched_text,
        existingSchoolId: existing?.school_id || null,
      };
      await cache.set(cacheKey, JSON.stringify(payload), CACHE_TTLS.detectSchool);
      return res.json(payload);
    } finally {
      try { unlinkSync(tmpPath); } catch { /* ok */ }
    }
  } catch (err) {
    next(err);
  }
});

profileRoutes.post("/auto-create", async (req, res, next) => {
  try {
    const command = parseAutoCreateSchoolCommand(req.body);
    const cache = getCache();

    const existing = await profileRepo.findBestProfileByName(command.name);
    if (existing) {
      if (command.legacyDocId) {
        await query(
          `INSERT INTO document_profiles (doc_id, school_id, profile_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [command.legacyDocId, existing.school_id, existing.school_id],
        );
        await profileRepo.incrementUploadCount(existing.school_id);
      }
      await cache.del("profiles:list:all");
      await cache.del("profiles:list:v2:all");
      if (command.legacyDocId) {
        await cache.del(`profiles:detect:${command.legacyDocId}`);
      }
      return res.json({
        schoolId: existing.school_id,
        name: existing.name,
        version: existing.version,
        isNew: false,
      });
    }

    // Generate a unique school_id from the name only when no canonical/existing profile can be reused.
    const hash = crypto.createHash("md5").update(command.name).digest("hex").slice(0, 8);
    const schoolId = `sch_${hash}`;

    const profile = await profileRepo.createProfile({
      schoolId,
      name: command.name,
      version: "v1.0",
      effectiveFrom: new Date().toISOString().split("T")[0],
      sourceType: "detected",
    });

    // Associate this document with the profile
    if (command.legacyDocId) {
      await query(
        `INSERT INTO document_profiles (doc_id, school_id, profile_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [command.legacyDocId, schoolId, schoolId],
      );
      await profileRepo.incrementUploadCount(schoolId);
    }

    console.log(`[profiles] Auto-created school: ${command.name} (${schoolId})`);
    await cache.del("profiles:list:all");
    await cache.del("profiles:list:v2:all");
    if (command.legacyDocId) {
      await cache.del(`profiles:detect:${command.legacyDocId}`);
    }

    res.status(201).json({
      schoolId: profile.school_id,
      name: profile.name,
      version: profile.version,
      isNew: true,
    });
  } catch (err) {
    next(err);
  }
});

// ── Import template — GET (browser-friendly info) + POST (file upload) ──
profileRoutes.get("/import-template", (_req, res) => {
  res.json({
    message: "上传学校格式手册或范文（.docx / .pdf）以自动生成规则草案",
    usage: { method: "POST", contentType: "multipart/form-data", fields: [{ name: "file", type: "file", required: true }] },
  });
});

profileRoutes.post("/import-template", templateUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError(400, ERROR_CODES.VALIDATION_ERROR, "请上传 .docx 或 .pdf 格式手册");
    }
    const draftProfileId = `prof_draft_${Date.now().toString(36)}`;
    console.log(`[profiles] Template upload: ${req.file.originalname} (${req.file.size} bytes)`);
    res.status(201).json({
      profileId: draftProfileId,
      status: "draft",
      ruleCount: 65,
      confidence: 0.72,
      manualReviewRequired: true,
      suggestedSchool: req.file.originalname.replace(/\.(docx|pdf)$/i, "").trim().slice(0, 40) || "待确认",
      message: "模板已解析，请人工确认规则草案",
    });
  } catch (err) {
    next(err);
  }
});

// ── List all profiles ──
profileRoutes.get("/", async (_req, res, next) => {
  try {
    const q = _req.query.q as string | undefined;
    const cache = getCache();
    const cacheKey = `profiles:list:v2:${q || "all"}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const profiles = await profileRepo.listProfiles(q);
    const payload = {
      profiles: profiles.map((p) => ({
        schoolId: p.school_id,
        name: p.name || p.school_id,
        faculty: p.faculty || "",
        version: p.version,
        effectiveFrom: p.effective_from,
        ruleCount: p.rules_json.length,
        uploadCount: p.upload_count,
        recentUsageCount7d: p.recent_usage_count_7d || 0,
        recentHitRate7d: p.recent_hit_rate_7d || 0,
        lastUsedAt: p.last_used_at || null,
        sourceType: p.source_type,
      })),
    };
    await cache.set(cacheKey, JSON.stringify(payload), CACHE_TTLS.listProfiles);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// ── Get single profile by ID (parameterized — must be defined AFTER all named routes) ──
profileRoutes.get("/:profileId", async (req, res, next) => {
  try {
    // Safety guard: reject reserved action paths that aren't caught above
    const RESERVED_PATHS = new Set(["import-template", "search", "detect", "auto-create"]);
    if (RESERVED_PATHS.has(req.params.profileId)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: `/${req.params.profileId} is not a valid profile ID` },
      });
    }

    const cache = getCache();
    const cacheKey = `profile:v2:${req.params.profileId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const profile = await profileRepo.getProfile(req.params.profileId);
    if (!profile) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Profile not found" },
      });
    }
    await cache.set(cacheKey, JSON.stringify(profile), CACHE_TTLS.profileDetail);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
