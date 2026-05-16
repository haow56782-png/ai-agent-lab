import type { FindingContract } from "../../../../../packages/shared-types/src/finding-contract";

const FORMATTER_URL = process.env.FORMATTER_URL || "http://localhost:5000";

function buildFormatterFindingContext(findings: FindingContract[]) {
  return findings.map((finding) => ({
    finding_id: finding.finding_id,
    rule_id: finding.rule_id,
    rule_group: finding.rule_group,
    rule_text: finding.rule_snapshot.rule_text,
    rule_description: finding.rule_snapshot.rule_description,
    evidence_snapshot: finding.evidence_snapshot,
  }));
}

export async function callFormatterService(
  documentBuffer: Buffer,
  filename: string,
  profileId: string,
  findingContext: FindingContract[] = [],
): Promise<{ formatted: Buffer; diff: any }> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(documentBuffer)]), filename);
  formData.append("profile_id", profileId);
  if (findingContext.length > 0) {
    formData.append("finding_context", JSON.stringify(buildFormatterFindingContext(findingContext)));
  }

  const response = await fetch(`${FORMATTER_URL}/format`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unknown error");
    throw new Error(`Formatter service returned ${response.status}: ${errorBody}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("multipart")) {
    const responseFormData = await response.formData();
    const formattedFile = responseFormData.get("formatted") as Blob;
    const diffFile = responseFormData.get("diff") as Blob;

    return {
      formatted: Buffer.from(await formattedFile.arrayBuffer()),
      diff: JSON.parse(await diffFile.text()),
    };
  }

  return {
    formatted: Buffer.from(await response.arrayBuffer()),
    diff: {
      diffs: [],
      summary: { pages: 0, changeCount: 0, contentChanges: 0, formatChanges: 0 },
    },
  };
}
