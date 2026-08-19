import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import path from "path";
import { createS3Client, type S3Client } from "./s3-lightweight.js";

const BUCKETS = {
  uploads: "paper-uploads",
  outputs: "paper-outputs",
  reports: "paper-reports",
} as const;

let client: ReturnType<typeof createS3Client> | null = null;
let initialized = false;

function isLocalStorage(): boolean {
  return process.env.USE_LOCAL_STORAGE === "true" || process.env.STORAGE_DIR !== undefined;
}

function getStorageDir(): string {
  return process.env.STORAGE_DIR || "/app/data";
}

function getClient() {
  if (!client) {
    client = createS3Client({
      endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
      region: "us-east-1",
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    });
  }
  return client;
}

async function uploadToS3(bucketName: string, key: string, buffer: Buffer, contentType?: string): Promise<string> {
  const s3 = getClient();
  await s3.putObject(bucketName, key, buffer, contentType);
  return `${bucketName}/${key}`;
}

async function downloadFromS3(bucketName: string, key: string): Promise<Buffer> {
  const s3 = getClient();
  return await s3.getObject(bucketName, key);
}

async function deleteFromS3(bucketName: string, key: string): Promise<void> {
  const s3 = getClient();
  await s3.deleteObject(bucketName, key);
}

// ── Local filesystem fallback ──

function localPath(bucketName: string, key: string): string {
  const dir = getStorageDir();
  return path.join(dir, bucketName, key);
}

function ensureLocalDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function uploadLocal(bucketName: string, key: string, buffer: Buffer): Promise<string> {
  const filePath = localPath(bucketName, key);
  ensureLocalDir(filePath);
  writeFileSync(filePath, buffer);
  return `${bucketName}/${key}`;
}

async function downloadLocal(bucketName: string, key: string): Promise<Buffer> {
  const filePath = localPath(bucketName, key);
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return readFileSync(filePath);
}

async function deleteLocal(bucketName: string, key: string): Promise<void> {
  const filePath = localPath(bucketName, key);
  if (existsSync(filePath)) unlinkSync(filePath);
}

export async function ensureBuckets(): Promise<void> {
  if (initialized) return;

  if (isLocalStorage()) {
    const dir = getStorageDir();
    for (const bucket of Object.values(BUCKETS)) {
      const bucketDir = path.join(dir, bucket);
      if (!existsSync(bucketDir)) mkdirSync(bucketDir, { recursive: true });
    }
    console.log("[storage] Local filesystem storage initialized");
    initialized = true;
    return;
  }

  const s3 = getClient();
  for (const bucket of Object.values(BUCKETS)) {
    try {
      await s3.listObjectsV2(bucket, 1);
    } catch {
      try {
        await s3.createBucket(bucket);
        console.log(`[storage] Created bucket: ${bucket}`);
      } catch (createErr: any) {
        if (
          !String(createErr).includes("BucketAlreadyExists") &&
          !String(createErr).includes("BucketAlreadyOwnedByYou")
        ) {
          console.warn(`[storage] Bucket ${bucket} may not exist: ${createErr.message}`);
        }
      }
    }
  }
  initialized = true;
}

export async function uploadFile(
  bucket: keyof typeof BUCKETS,
  key: string,
  buffer: Buffer,
  contentType?: string,
): Promise<string> {
  const bucketName = BUCKETS[bucket];
  if (isLocalStorage()) return uploadLocal(bucketName, key, buffer);
  return uploadToS3(bucketName, key, buffer, contentType);
}

export async function downloadFile(
  bucket: keyof typeof BUCKETS,
  key: string,
): Promise<Buffer> {
  const bucketName = BUCKETS[bucket];
  if (isLocalStorage()) return downloadLocal(bucketName, key);
  return downloadFromS3(bucketName, key);
}

export async function deleteFile(
  bucket: keyof typeof BUCKETS,
  key: string,
): Promise<void> {
  const bucketName = BUCKETS[bucket];
  if (isLocalStorage()) return deleteLocal(bucketName, key);
  return deleteFromS3(bucketName, key);
}

export function getObjectUrl(
  bucket: keyof typeof BUCKETS,
  key: string,
): string {
  return `/api/v1/storage/${BUCKETS[bucket]}/${key}`;
}

export function getStoragePath(
  bucket: keyof typeof BUCKETS,
  docId: string,
  filename: string,
): string {
  const ext = filename.split(".").pop() || "bin";
  return `${docId}/${docId}.${ext}`;
}
