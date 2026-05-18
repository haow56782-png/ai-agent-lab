/**
 * VIB AI — Configuration Manager
 *
 * Load order: env var > config file (yaml/json) > defaults
 * env var keys are uppercase with dots replaced by underscores:
 *   LLM_TEMPERATURE → config.get("llm.temperature")
 *   LLM_RETRY_MAX   → config.get("llm.retry.max")
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULTS = {
    "llm.temperature": 0.7,
    "llm.maxTokens": 4096,
    "llm.model": "deepseek-chat",
    "llm.opusModel": "",
    "llm.timeoutMs": 30000,
    "llm.retry.max": 3,
    "llm.retry.delayMs": 1000,
    "llm.retry.backoff": 2,
    "agent.maxIterations": 10,
    "agent.replHistorySize": 50,
    "log.level": "info",
};
function loadConfigFile() {
    const paths = [
        join(__dirname, "..", "config.yaml"),
        join(__dirname, "..", "config.json"),
        join(__dirname, "..", "..", "config.yaml"),
    ];
    for (const p of paths) {
        if (existsSync(p)) {
            try {
                const raw = readFileSync(p, "utf-8");
                // Simple YAML-like parse for flat keys
                const result = {};
                for (const line of raw.split("\n")) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith("#"))
                        continue;
                    const colonIdx = trimmed.indexOf(":");
                    if (colonIdx === -1)
                        continue;
                    const key = trimmed.slice(0, colonIdx).trim();
                    const value = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
                    if (key && value)
                        result[key] = value;
                }
                return result;
            }
            catch {
                return {};
            }
        }
    }
    return {};
}
function parseEnvKey(key) {
    return key.replace(/_/g, ".").toLowerCase();
}
function loadEnvOverrides() {
    const result = {};
    for (const [rawKey, value] of Object.entries(process.env)) {
        if (!value)
            continue;
        const key = parseEnvKey(rawKey);
        if (key in DEFAULTS || key.startsWith("llm.") || key.startsWith("agent.") || key.startsWith("log.")) {
            result[key] = value;
        }
    }
    return result;
}
/** Convert raw string values to match the default type */
function coerceValue(key, raw) {
    const def = DEFAULTS[key];
    // If the default is a number and the string looks numeric, parse it
    if (typeof def === "number") {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed))
            return parsed;
    }
    // If the default is a boolean
    if (typeof def === "boolean") {
        if (raw === "true" || raw === "1")
            return true;
        if (raw === "false" || raw === "0")
            return false;
    }
    return raw;
}
const configFile = loadConfigFile();
const envOverrides = loadEnvOverrides();
export function get(key) {
    // 1. env override
    if (key in envOverrides)
        return coerceValue(key, envOverrides[key]);
    // 2. config file
    if (key in configFile) {
        const raw = configFile[key];
        return (typeof raw === "string" ? coerceValue(key, raw) : raw);
    }
    // 3. defaults
    if (key in DEFAULTS)
        return DEFAULTS[key];
    throw new Error(`Unknown config key: ${key}`);
}
export function getAll() {
    const merged = { ...DEFAULTS, ...configFile, ...envOverrides };
    // Ensure all DEFAULTS keys are present
    for (const k of Object.keys(DEFAULTS)) {
        if (!(k in merged))
            merged[k] = DEFAULTS[k];
    }
    return merged;
}
export function formatConfig() {
    const all = getAll();
    const lines = Object.entries(all)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `  ${k.padEnd(30)} = ${v}`);
    return `Config:\n${lines.join("\n")}`;
}
//# sourceMappingURL=config.js.map