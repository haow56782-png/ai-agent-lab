import { createError, ERROR_CODES } from "../middleware/error-handler.js";
// Shared request field readers for HTTP DTO adapters.
// They normalize unknown Express body/query values into typed command fields.
// Domain DTO files own business naming; this file only owns low-level parsing.
export function readString(record, key) {
    if (!record || typeof record !== "object" || !(key in record))
        return undefined;
    const value = record[key];
    if (Array.isArray(value))
        return typeof value[0] === "string" && value[0].trim() ? value[0].trim() : undefined;
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
export function hasKey(record, key) {
    return Boolean(record && typeof record === "object" && key in record);
}
export function readStringArray(record, key) {
    if (!record || typeof record !== "object" || !(key in record))
        return undefined;
    const value = record[key];
    if (!Array.isArray(value))
        return undefined;
    const items = value
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim());
    return items.length > 0 ? items : undefined;
}
export function requireString(record, key) {
    const value = readString(record, key);
    if (!value) {
        throw createError(400, ERROR_CODES.VALIDATION_ERROR, `${key} is required`);
    }
    return value;
}
