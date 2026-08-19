/**
 * Lightweight S3/MinIO client — zero npm dependencies.
 *
 * Replaces @aws-sdk/client-s3 with native node:crypto (AWS SigV4) + fetch.
 * Covers: PutObject, GetObject, DeleteObject, ListObjectsV2, CreateBucket.
 *
 * @module s3-lightweight
 */

import { createHash, createHmac } from "node:crypto";

// ── Types ───────────────────────────────────────────────────────────────────

export interface S3Config {
  endpoint: string; // e.g. "http://localhost:9000"
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface S3Request {
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  bucket: string;
  key?: string;
  query?: Record<string, string>;
  body?: Buffer;
  contentType?: string;
}

// ── AWS Signature V4 ────────────────────────────────────────────────────────

const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
): Buffer {
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

function buildAuthorization(
  config: S3Config,
  method: string,
  bucket: string,
  key: string | undefined,
  query: Record<string, string>,
  payloadHash: string,
  headers: Record<string, string>,
): { authorization: string; amzDate: string; dateStamp: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const hostname = new URL(config.endpoint).hostname;
  const endpointPath =
    new URL(config.endpoint).pathname.replace(/\/$/, "") || "";

  // Canonical URI (path-style: /bucket/key)
  const path = key
    ? `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`
    : `/${bucket}`;
  const fullPath = endpointPath + path;

  // Canonical query string
  const sortedQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k]!)}`)
    .join("&");

  // Canonical headers
  const signedHeaderNames = ["host", "x-amz-content-sha256", "x-amz-date"];
  if (headers["content-type"]) signedHeaderNames.push("content-type");

  const canonicalHeaders = signedHeaderNames
    .sort()
    .map((h) => `${h}:${headers[h] ?? ""}`)
    .join("\n");

  const signedHeaders = signedHeaderNames.sort().join(";");

  // Canonical request
  const canonicalRequest = [
    method,
    fullPath || "/",
    sortedQuery,
    canonicalHeaders + "\n",
    signedHeaders,
    payloadHash,
  ].join("\n");

  // String to sign
  const credentialScope = `${dateStamp}/${config.region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  // Signature
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region);
  const signature = hmac(signingKey, stringToSign).toString("hex");

  const authorization = [
    ALGORITHM,
    `Credential=${config.accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(" ");

  return { authorization, amzDate, dateStamp };
}

// ── HTTP transport ──────────────────────────────────────────────────────────

function buildUrl(config: S3Config, bucket: string, key?: string, query?: Record<string, string>): string {
  let url = `${config.endpoint.replace(/\/$/, "")}/${bucket}`;
  if (key) url += `/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

async function s3Request(
  config: S3Config,
  req: S3Request,
): Promise<Response> {
  const body = req.body ?? Buffer.alloc(0);
  const payloadHash = sha256(body);
  const query = req.query ?? {};

  const headers: Record<string, string> = {
    host: new URL(config.endpoint).host,
    "x-amz-content-sha256": payloadHash,
  };
  if (req.contentType) {
    headers["content-type"] = req.contentType;
  }

  const { authorization, amzDate } = buildAuthorization(
    config,
    req.method,
    req.bucket,
    req.key,
    query,
    payloadHash,
    headers,
  );

  headers["x-amz-date"] = amzDate;
  headers["Authorization"] = authorization;

  const url = buildUrl(config, req.bucket, req.key, query);

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: body.length > 0 ? new Uint8Array(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`S3 ${req.method} ${req.bucket}/${req.key ?? ""}: ${res.status} — ${errText}`);
  }

  return res;
}

// ── Public API (mirrors the current @aws-sdk usage) ─────────────────────────

export function createS3Client(config: S3Config) {
  return {
    /** Upload an object. Returns the key path. */
    async putObject(
      bucket: string,
      key: string,
      body: Buffer,
      contentType?: string,
    ): Promise<void> {
      await s3Request(config, {
        method: "PUT",
        bucket,
        key,
        body,
        contentType: contentType || "application/octet-stream",
      });
    },

    /** Download an object. Returns the body as Buffer. */
    async getObject(bucket: string, key: string): Promise<Buffer> {
      const res = await s3Request(config, {
        method: "GET",
        bucket,
        key,
      });
      return Buffer.from(await res.arrayBuffer());
    },

    /** Delete an object. */
    async deleteObject(bucket: string, key: string): Promise<void> {
      await s3Request(config, {
        method: "DELETE",
        bucket,
        key,
      });
    },

    /** List objects in a bucket (V2 API). Returns up to limit keys. */
    async listObjectsV2(
      bucket: string,
      maxKeys?: number,
    ): Promise<string[]> {
      const query: Record<string, string> = { "list-type": "2" };
      if (maxKeys) query["max-keys"] = String(maxKeys);

      const res = await s3Request(config, {
        method: "GET",
        bucket,
        query,
      });

      const xml = await res.text();
      // Minimal XML parsing — extract <Key> values
      const keys: string[] = [];
      const re = /<Key>([^<]+)<\/Key>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        keys.push(m[1]!);
      }
      return keys;
    },

    /** Create a bucket (idempotent — ignores already-exists errors). */
    async createBucket(bucket: string): Promise<void> {
      const res = await s3Request(config, {
        method: "PUT",
        bucket,
      });
      // Some MinIO versions return 409 Conflict instead of 200 for existing buckets
      // We ignore that in the caller's catch block
      if (!res.ok && res.status !== 409) {
        const errText = await res.text().catch(() => res.statusText);
        if (!errText.includes("BucketAlreadyExists") && !errText.includes("BucketAlreadyOwnedByYou")) {
          throw new Error(`CreateBucket ${bucket}: ${res.status} — ${errText}`);
        }
      }
    },
  };
}

export type S3Client = ReturnType<typeof createS3Client>;
