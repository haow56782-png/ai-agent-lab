import net from "node:net";

type RedisTarget = {
  host: string;
  port: number;
  password?: string;
};

const REDIS_URL = process.env.REDIS_URL || "";
const REDIS_ENABLED = !!REDIS_URL;

function parseRedisUrl(value: string): RedisTarget | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const password = url.password || undefined;
    return {
      host: url.hostname || "redis",
      port: Number(url.port || 6379),
      password,
    };
  } catch {
    return null;
  }
}

const redisTarget = parseRedisUrl(REDIS_URL);

function encodeBulk(value: string): string {
  return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
}

function encodeCommand(parts: Array<string | number>): string {
  const normalized = parts.map((part) => String(part));
  return `*${normalized.length}\r\n${normalized.map(encodeBulk).join("")}`;
}

function parseSimpleResponse(input: string): string | null {
  if (!input) return null;
  const prefix = input[0];
  if (prefix === "$") {
    const [head, ...rest] = input.split("\r\n");
    if (head === "$-1") return null;
    return rest[0] ?? null;
  }
  if (prefix === "+") return input.slice(1).split("\r\n")[0] || null;
  if (prefix === ":") return input.slice(1).split("\r\n")[0] || null;
  if (prefix === "-") throw new Error(input.slice(1).split("\r\n")[0] || "Redis error");
  return null;
}

let authenticated = false;

async function send(parts: Array<string | number>): Promise<string | null> {
  if (!REDIS_ENABLED || !redisTarget) return null;
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(redisTarget.port, redisTarget.host);
    let raw = "";
    socket.setTimeout(2000);
    socket.on("connect", () => {
      if (redisTarget.password && !authenticated) {
        // Send AUTH command first
        socket.write(encodeCommand(["AUTH", redisTarget.password]));
        authenticated = true;
      }
      socket.write(encodeCommand(parts));
    });
    socket.on("data", (chunk) => {
      raw += chunk.toString("utf8");
      // Wait for all responses (AUTH + actual command)
      if (redisTarget.password && raw.split("\r\n").length < 4) return;
      if (raw.includes("\r\n")) {
        socket.end();
      }
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Redis timeout"));
    });
    socket.on("error", reject);
    socket.on("close", () => {
      try {
        // If AUTH was sent, skip its response and parse the actual command response
        if (redisTarget.password) {
          const responses = raw.split("\r\n");
          // AUTH response is first 2 tokens (+OK\r\n), skip it
          raw = responses.slice(2).join("\r\n");
        }
        resolve(parseSimpleResponse(raw));
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function isRedisEnabled(): boolean {
  return REDIS_ENABLED && !!redisTarget;
}

export async function redisGet(key: string): Promise<string | null> {
  try {
    return await send(["GET", key]);
  } catch (err: any) {
    console.warn(`[redis] GET ${key} failed:`, err.message);
    return null;
  }
}

export async function redisSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  try {
    await send(["SETEX", key, ttlSeconds, value]);
  } catch (err: any) {
    console.warn(`[redis] SETEX ${key} failed:`, err.message);
  }
}

export async function redisDel(key: string): Promise<void> {
  try {
    await send(["DEL", key]);
  } catch (err: any) {
    console.warn(`[redis] DEL ${key} failed:`, err.message);
  }
}

/** Lightweight connectivity test. Returns true if Redis responds to PING. */
export async function redisPing(): Promise<boolean> {
  try {
    const result = await send(["PING"]);
    return result === "PONG";
  } catch {
    return false;
  }
}
