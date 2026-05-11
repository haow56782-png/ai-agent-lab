import { Router } from "express";
import * as profileRepo from "../repositories/profiles.js";
import * as docRepo from "../repositories/documents.js";
import * as storage from "../storage.js";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import {
  parseAutoCreateSchoolCommand,
  parseDetectSchoolCommand,
} from "../dto/document-requests.js";
import { query } from "../db.js";
import { redisDel, redisGet, redisSetEx } from "../redis.js";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

export const profileRoutes = Router();

const DETECT_SCRIPT = process.env.DETECT_SCHOOL_SCRIPT ||
  path.resolve(import.meta.dirname, "../parser/detect_school.py");
const TEMP_DIR = path.join(os.tmpdir(), "zheng-gao-detect");

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
}

const CACHE_TTLS = {
  listProfiles: 90,
  profileDetail: 180,
  detectSchool: 300,
};

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
        schoolName: p.school_id,
        version: p.version,
        ruleCount: p.rules_json.length,
        sourceType: p.source_type,
      })),
    });
  } catch (err) {
    next(err);
  }
});

profileRoutes.get("/:profileId", async (req, res, next) => {
  try {
    const cacheKey = `profile:${req.params.profileId}`;
    const cached = await redisGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const profile = await profileRepo.getProfile(req.params.profileId);
    if (!profile) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Profile not found" },
      });
    }
    await redisSetEx(cacheKey, CACHE_TTLS.profileDetail, JSON.stringify(profile));
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// ── List all profiles ──
profileRoutes.get("/", async (_req, res, next) => {
  try {
    const q = _req.query.q as string | undefined;
    const cacheKey = `profiles:list:${q || "all"}`;
    const cached = await redisGet(cacheKey);
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
        ruleCount: p.rules_json.length,
        uploadCount: p.upload_count,
        sourceType: p.source_type,
      })),
    };
    await redisSetEx(cacheKey, CACHE_TTLS.listProfiles, JSON.stringify(payload));
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// ── Detect school from DOCX ──
profileRoutes.post("/detect", async (req, res, next) => {
  try {
    const command = parseDetectSchoolCommand(req.body);
    const cacheKey = `profiles:detect:${command.legacyDocId}`;
    const cached = await redisGet(cacheKey);
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
        await redisSetEx(cacheKey, CACHE_TTLS.detectSchool, JSON.stringify(payload));
        return res.json(payload);
      }

      // Check if this school already exists
      const existing = await profileRepo.findProfileByName(output.name);
      const payload = {
        detected: true,
        name: output.name,
        confidence: output.confidence,
        matchedText: output.matched_text,
        existingSchoolId: existing?.school_id || null,
      };
      await redisSetEx(cacheKey, CACHE_TTLS.detectSchool, JSON.stringify(payload));
      return res.json(payload);
    } finally {
      try { unlinkSync(tmpPath); } catch { /* ok */ }
    }
  } catch (err) {
    next(err);
  }
});

// ── Auto-create a new school profile ──
profileRoutes.post("/auto-create", async (req, res, next) => {
  try {
    const command = parseAutoCreateSchoolCommand(req.body);

    // Generate a unique school_id from the name
    const hash = crypto.createHash("md5").update(command.name).digest("hex").slice(0, 8);
    const schoolId = `sch_${hash}`;

    // Check if already exists (race condition guard)
    const existing = await profileRepo.findProfileByName(command.name);
    if (existing) {
      return res.json({
        schoolId: existing.school_id,
        name: existing.name,
        version: existing.version,
        isNew: false,
      });
    }

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
    await redisDel("profiles:list:all");
    if (command.legacyDocId) {
      await redisDel(`profiles:detect:${command.legacyDocId}`);
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

profileRoutes.post("/import-template", async (req, res, next) => {
  try {
    const draftProfileId = `prof_draft_${Date.now().toString(36)}`;
    res.status(201).json({
      profileId: draftProfileId,
      status: "draft",
      ruleCount: 65,
      confidence: 0.72,
      manualReviewRequired: true,
      suggestedSchool: "待确认",
      message: "模板已解析，请人工确认规则草案",
    });
  } catch (err) {
    next(err);
  }
});
