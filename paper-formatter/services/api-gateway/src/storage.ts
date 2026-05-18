import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import path from "path";

const BUCKETS = {
  uploads: "paper-uploads",
  outputs: "paper-outputs",
  reports: "paper-reports",
} as const;

let client: S3Client | null = null;
let initialized = false;

function isLocalStorage(): boolean {
  return process.env.USE_LOCAL_STORAGE === "true" || process.env.STORAGE_DIR !== undefined;
}

function getStorageDir(): string {
  return process.env.STORAGE_DIR || "/app/data";
}

function getClient(): S3Client {
  if (!client) {
    const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
    const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
    const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";

    client = new S3Client({
      endpoint,
      region: "us-east-1",
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
  }
  return client;
}

async function uploadToS3(bucketName: string, key: string, buffer: Buffer, contentType?: string): Promise<string> {
  const s3 = getClient();
  await s3.send(new PutObjectCommand({
    Bucket: bucketName, Key: key, Body: buffer,
    ContentType: contentType || "application/octet-stream",
  }));
  return `${bucketName}/${key}`;
}

async function downloadFromS3(bucketName: string, key: string): Promise<Buffer> {
  const s3 = getClient();
  const response = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  return streamToBuffer(response.Body as Readable);
}

async function deleteFromS3(bucketName: string, key: string): Promise<void> {
  const s3 = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
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

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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
      await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    } catch {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log(`[storage] Created bucket: ${bucket}`);
      } catch (createErr: any) {
        if (createErr.name !== "BucketAlreadyOwnedByYou" && createErr.name !== "BucketAlreadyExists") {
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
