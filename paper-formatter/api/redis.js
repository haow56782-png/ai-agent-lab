import net from "node:net";
const REDIS_URL = process.env.REDIS_URL || "";
const REDIS_ENABLED = !!REDIS_URL;
function parseRedisUrl(value) {
    if (!value)
        return null;
    try {
        const url = new URL(value);
        return {
            host: url.hostname || "redis",
            port: Number(url.port || 6379),
        };
    }
    catch {
        return null;
    }
}
const redisTarget = parseRedisUrl(REDIS_URL);
function encodeBulk(value) {
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
}
function encodeCommand(parts) {
    const normalized = parts.map((part) => String(part));
    return `*${normalized.length}\r\n${normalized.map(encodeBulk).join("")}`;
}
function parseSimpleResponse(input) {
    if (!input)
        return null;
    const prefix = input[0];
    if (prefix === "$") {
        const [head, ...rest] = input.split("\r\n");
        if (head === "$-1")
            return null;
        return rest[0] ?? null;
    }
    if (prefix === "+")
        return input.slice(1).split("\r\n")[0] || null;
    if (prefix === ":")
        return input.slice(1).split("\r\n")[0] || null;
    if (prefix === "-")
        throw new Error(input.slice(1).split("\r\n")[0] || "Redis error");
    return null;
}
async function send(parts) {
    if (!REDIS_ENABLED || !redisTarget)
        return null;
    return await new Promise((resolve, reject) => {
        const socket = net.createConnection(redisTarget.port, redisTarget.host);
        let raw = "";
        socket.setTimeout(1200);
        socket.on("connect", () => {
            socket.write(encodeCommand(parts));
        });
        socket.on("data", (chunk) => {
            raw += chunk.toString("utf8");
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
                resolve(parseSimpleResponse(raw));
            }
            catch (err) {
                reject(err);
            }
        });
    });
}
export function isRedisEnabled() {
    return REDIS_ENABLED && !!redisTarget;
}
export async function redisGet(key) {
    try {
        return await send(["GET", key]);
    }
    catch {
        return null;
    }
}
export async function redisSetEx(key, ttlSeconds, value) {
    try {
        await send(["SETEX", key, ttlSeconds, value]);
    }
    catch {
        // Ignore cache writes in degraded mode
    }
}
export async function redisDel(key) {
    try {
        await send(["DEL", key]);
    }
    catch {
        // Ignore cache invalidation in degraded mode
    }
}
