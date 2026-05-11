import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

const BUCKETS = {
  uploads: "paper-uploads",
  outputs: "paper-outputs",
  reports: "paper-reports",
} as const;

let client: S3Client | null = null;
let initialized = false;

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

export async function ensureBuckets(): Promise<void> {
  if (initialized) return;
  const s3 = getClient();

  for (const bucket of Object.values(BUCKETS)) {
    try {
      await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    } catch {
      // Bucket doesn't exist yet — create via S3 API (MinIO supports this)
      // We use the internal MinIO API via S3 putBucket
      try {
        await s3.send(
          new CreateBucketCommand({ Bucket: bucket }),
        );
        console.log(`[storage] Created bucket: ${bucket}`);
      } catch (createErr: any) {
        // Some S3-compatible stores don't need explicit creation
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
  const s3 = getClient();
  const bucketName = BUCKETS[bucket];

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    }),
  );

  return `${bucketName}/${key}`;
}

export async function downloadFile(
  bucket: keyof typeof BUCKETS,
  key: string,
): Promise<Buffer> {
  const s3 = getClient();
  const bucketName = BUCKETS[bucket];

  const response = await s3.send(
    new GetObjectCommand({ Bucket: bucketName, Key: key }),
  );

  return streamToBuffer(response.Body as Readable);
}

export async function deleteFile(
  bucket: keyof typeof BUCKETS,
  key: string,
): Promise<void> {
  const s3 = getClient();
  await s3.send(
    new DeleteObjectCommand({ Bucket: BUCKETS[bucket], Key: key }),
  );
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

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
