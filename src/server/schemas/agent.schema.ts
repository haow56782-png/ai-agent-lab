/** Validation for POST /api/agent/analyze */

const MAX_URL_LENGTH = 4096;

export interface AnalyzeRequestBody {
  url: string;
  gameId?: string;
  platform?: string;
  userId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAnalyzeRequest(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (typeof body.url !== "string") {
    errors.push("url must be a string");
  } else {
    const trimmed = body.url.trim();
    if (!trimmed) {
      errors.push("url must not be empty");
    } else if (trimmed.length > MAX_URL_LENGTH) {
      errors.push(`url must not exceed ${MAX_URL_LENGTH} characters`);
    } else {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          errors.push("url must use http or https scheme");
        }
      } catch {
        errors.push("url must be a valid URL");
      }
    }
  }

  if (body.gameId != null && typeof body.gameId !== "string") {
    errors.push("gameId must be a string");
  }
  if (body.platform != null && typeof body.platform !== "string") {
    errors.push("platform must be a string");
  }
  if (body.userId != null && typeof body.userId !== "string") {
    errors.push("userId must be a string");
  }

  return { valid: errors.length === 0, errors };
}
