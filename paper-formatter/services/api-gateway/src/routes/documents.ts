import { Router } from "express";
import multer from "multer";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import * as docRepo from "../repositories/documents.js";
import * as storage from "../storage.js";
import { normalizeDocumentFilename } from "../utils/document-filename.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const ext = normalizeDocumentFilename(file.originalname).toLowerCase().split(".").pop();
    if (ext === "docx" || ext === "pdf") {
      cb(null, true);
    } else {
      cb(createError(422, ERROR_CODES.UNSUPPORTED_FORMAT, `Unsupported format: .${ext}`) as any);
    }
  },
});

export const documentRoutes = Router();

documentRoutes.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw createError(400, ERROR_CODES.VALIDATION_ERROR, "file is required");
    const normalizedFilename = normalizeDocumentFilename(req.file.originalname);

    // Reject OLE2 files (old .doc format) even if extension says .docx
    const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    if (req.file.buffer.slice(0, 8).equals(OLE2_MAGIC)) {
      throw createError(
        400,
        ERROR_CODES.UNSUPPORTED_FORMAT,
        "文件是旧版 .doc 格式（WPS 兼容模式），不支持直接排版。请用 WPS/Word 打开后另存为 .docx 格式再试。"
      );
    }

    const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    const docId = `doc_${uuid().slice(0, 8)}`;
    const canonicalDocumentId = uuid();
    const ext = normalizedFilename.toLowerCase().split(".").pop() as string;

    // Store file in MinIO
    const storagePath = storage.getStoragePath("uploads", docId, normalizedFilename);
    await storage.uploadFile("uploads", storagePath, req.file.buffer);

    // Create DB record
    const record = await docRepo.createDocument({
      docId,
      canonicalDocumentId,
      filename: normalizedFilename,
      size_bytes: req.file.size,
      sha256,
      file_type: ext,
    });

    res.status(201).json({
      docId: record.doc_id,
      canonicalDocumentId: record.canonical_document_id,
      filename: normalizeDocumentFilename(record.filename),
      size: record.size_bytes,
      sha256: record.sha256,
      fileType: record.file_type,
      createdAt: record.created_at,
    });
  } catch (err) {
    next(err);
  }
});

documentRoutes.get("/:docId", async (req, res, next) => {
  try {
    const record = await docRepo.getDocument(req.params.docId);
    if (!record) throw createError(404, ERROR_CODES.NOT_FOUND, "Document not found");

    res.json({
      docId: record.doc_id,
      canonicalDocumentId: record.canonical_document_id,
      filename: normalizeDocumentFilename(record.filename),
      size: record.size_bytes,
      sha256: record.sha256,
      fileType: record.file_type,
      pageCount: record.page_count,
      createdAt: record.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// Storage proxy: serve files from MinIO
// Uses query param `path` to avoid route param slash issues
documentRoutes.get("/storage", async (req, res, next) => {
  try {
    const bucket = req.query.bucket as string;
    const key = req.query.path as string;
    if (!bucket || !key) throw createError(400, ERROR_CODES.VALIDATION_ERROR, "bucket and path query params required");

    const bucketMap: Record<string, "uploads" | "outputs" | "reports"> = {
      "paper-uploads": "uploads",
      "paper-outputs": "outputs",
      "paper-reports": "reports",
    };

    const mapped = bucketMap[bucket];
    if (!mapped) throw createError(404, ERROR_CODES.NOT_FOUND, "Unknown storage bucket");

    const buffer = await storage.downloadFile(mapped, key);

    const ext = key.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pdf: "application/pdf",
      json: "application/json",
    };

    res.setHeader("Content-Type", contentTypes[ext || ""] || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
