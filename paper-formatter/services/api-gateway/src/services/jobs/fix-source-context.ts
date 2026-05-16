import type { FindingContract } from "../../../../../packages/shared-types/src/finding-contract";
import * as findingRepo from "../../repositories/findings.js";
import * as jobRepo from "../../repositories/jobs.js";

export interface FixSourceContext {
  chapters: string[];
  snippets: string[];
  findings: FindingContract[];
}

function cleanSourceLine(sourceValue: unknown): string {
  return String(sourceValue || "")
    .replace(/[\x00-\x08\x0e-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getFixSourceContext(sourceJobId: string | undefined, documentId: string): Promise<FixSourceContext> {
  const loadFallbackFindings = () => findingRepo.listFindings({ document_id: documentId }).catch(() => []);
  if (!sourceJobId) return { chapters: [], snippets: [], findings: await loadFallbackFindings() };

  try {
    const sourceJob = await jobRepo.getJob(sourceJobId);
    const sourceResult = (sourceJob?.result_json || {}) as Record<string, any>;
    const sourceFindings = Array.isArray(sourceResult.findings) ? sourceResult.findings as FindingContract[] : [];
    const rawHeadings = Array.isArray(sourceResult.rawHeadings) ? sourceResult.rawHeadings : [];
    const parsedTexts = Array.isArray(sourceResult.parsedTexts) ? sourceResult.parsedTexts : [];
    const chapters = rawHeadings
      .map((heading: any) => cleanSourceLine(typeof heading === "string" ? heading : heading?.text))
      .filter((sourceLine: string) => sourceLine.length > 2)
      .slice(0, 12);
    const snippets = parsedTexts
      .map(cleanSourceLine)
      .filter((sourceLine: string) => sourceLine.length > 16)
      .slice(0, 24);

    return { chapters, snippets, findings: sourceFindings.length > 0 ? sourceFindings : await loadFallbackFindings() };
  } catch {
    return { chapters: [], snippets: [], findings: await loadFallbackFindings() };
  }
}
