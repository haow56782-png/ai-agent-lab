import path from "path";

const MOJIBAKE_PATTERN = /[ÃÂåæçéèêëîïôöùûüÿ¢£¥¤½¼»«�]/;

function scoreFilename(value: string): number {
  const cjkCount = (value.match(/[\u3400-\u9fff]/g) || []).length;
  const mojibakeCount = (value.match(MOJIBAKE_PATTERN) || []).length;
  return (cjkCount * 4) - (mojibakeCount * 3) + value.length;
}

function repairLatin1Mojibake(value: string): string {
  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    if (!repaired || repaired.includes("\uFFFD")) return value;
    return scoreFilename(repaired) > scoreFilename(value) ? repaired : value;
  } catch {
    return value;
  }
}

export function normalizeDocumentFilename(input: string): string {
  const raw = String(input || "document");
  const basename = path.basename(raw).split(/[/\\]/).pop()?.replace(/\0/g, "").trim() || "document";
  if (!MOJIBAKE_PATTERN.test(basename)) return basename;
  return repairLatin1Mojibake(basename);
}
