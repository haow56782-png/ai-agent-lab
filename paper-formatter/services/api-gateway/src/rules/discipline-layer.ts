import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { SchoolProfile } from "../repositories/profiles.js";

type ProfileRulePayload = Pick<SchoolProfile, "school_id" | "rules_json" | "style_map">;

function parseScalar(value: string): string | number | boolean {
  const clean = value.trim().replace(/^["']|["']$/g, "");
  if (clean === "true") return true;
  if (clean === "false") return false;
  const numeric = Number(clean);
  return Number.isFinite(numeric) && clean !== "" ? numeric : clean;
}

function parseRuleLayerYaml(raw: string): any[] {
  const rules: any[] = [];
  let current: Record<string, any> | null = null;
  let inRules = false;

  for (const line of raw.split(/\r?\n/)) {
    if (/^rules:\s*$/.test(line)) {
      inRules = true;
      continue;
    }
    if (!inRules || /^\s*(#|$)/.test(line)) continue;

    const itemMatch = /^  -\s+([A-Za-z0-9_]+):\s*(.+?)\s*$/.exec(line);
    if (itemMatch) {
      if (current) rules.push(current);
      current = { [itemMatch[1]]: parseScalar(itemMatch[2]) };
      continue;
    }

    const fieldMatch = /^    ([A-Za-z0-9_]+):\s*(.+?)\s*$/.exec(line);
    if (fieldMatch && current) {
      current[fieldMatch[1]] = parseScalar(fieldMatch[2]);
    }
  }

  if (current) rules.push(current);
  return rules;
}

function findLayerFile(name: "stem"): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const relativeLayerPath = path.join(".claude", "skills", "word-system-skill", "rules", "layers", `discipline-${name}-rules.yaml`);
  const candidates = [
    path.join(process.cwd(), relativeLayerPath),
    path.join(process.cwd(), "..", "..", relativeLayerPath),
    path.join(process.cwd(), "paper-formatter", relativeLayerPath),
    path.join(dirname, "..", "..", "..", "..", relativeLayerPath),
    path.join(dirname, "..", "..", "..", "..", "..", "paper-formatter", relativeLayerPath),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Unable to load discipline rule layer: ${relativeLayerPath}`);
  }
  return found;
}

export function loadDisciplineRuleLayer(name: "stem"): any[] {
  const raw = readFileSync(findLayerFile(name), "utf-8");
  return parseRuleLayerYaml(raw).map((rule) => ({
    ...rule,
    ruleSource: "discipline",
    source: rule.source ?? "discipline",
  }));
}

export function mergeDisciplineLayer(
  profile: ProfileRulePayload | null | undefined,
  layer: any[],
): ProfileRulePayload {
  const rulesJson = [...(profile?.rules_json ?? [])];
  const styleMap = [...(profile?.style_map ?? [])];
  const existingRuleIds = new Set(
    [...rulesJson, ...styleMap].map((rule: any) => String(rule?.ruleId || rule?.rule_id || "")).filter(Boolean),
  );

  for (const rule of layer) {
    const ruleId = String(rule?.ruleId || rule?.rule_id || "");
    if (!ruleId || existingRuleIds.has(ruleId)) continue;
    rulesJson.push(rule);
    existingRuleIds.add(ruleId);
  }

  return {
    school_id: profile?.school_id ?? "discipline-stem",
    rules_json: rulesJson,
    style_map: styleMap,
  };
}
