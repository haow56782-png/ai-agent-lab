import { describe, expect, it } from "vitest";
import { buildRuleDetailsFromDetections } from "../src/rules/builders/rule-detail-builder.js";
import {
  CANONICAL_RULE_ID_EXEMPTIONS,
  DETECTOR_TO_CANONICAL_RULE_ID,
  canonicalizeRuleDetections,
  getCanonicalRuleCoverage,
  resolveCanonicalRuleId,
  resolveCanonicalRuleMapping,
} from "../src/rules/canonical-rule-map.js";
import { FRONT_MATTER_ROMAN_RULE_ID } from "../src/rules/detectors/footer-page-number.detector.js";
import { FORMAT_RULE_DETECTORS } from "../src/rules/rule-registry.js";
import type { RuleDetection } from "../src/rules/rule-types.js";

function makeDetection(ruleId: string): RuleDetection {
  return {
    ruleId,
    label: "缺 DOI",
    group: "参考文献",
    severity: "P2",
    confidence: 0.8,
    page: 1,
    snippet: "参考文献条目",
    suggestion: {
      type: "manual_review",
      before: "参考文献条目",
      after: "补齐 DOI",
      explanation: "参考文献 DOI 缺失",
    },
  };
}

describe("canonical rule id mapping", () => {
  it("requires every registered detector rule id to have a canonical mapping or explicit exemption", () => {
    const registeredRuleIds = FORMAT_RULE_DETECTORS.map((detector) => detector.ruleId);
    const knownMultiOutputRuleIds = [
      FRONT_MATTER_ROMAN_RULE_ID,
    ];
    const coverage = getCanonicalRuleCoverage({
      detectorRuleIds: [...registeredRuleIds, ...knownMultiOutputRuleIds],
    });

    expect(coverage.missing).toEqual([]);
    expect(Object.keys(CANONICAL_RULE_ID_EXEMPTIONS)).toEqual([]);
  });

  it("keeps canonical coverage targets explicit instead of empty placeholder mappings", () => {
    for (const [detectorRuleId, canonicalRuleId] of Object.entries(DETECTOR_TO_CANONICAL_RULE_ID)) {
      expect(detectorRuleId).not.toBe("");
      expect(canonicalRuleId).not.toBe("");
      expect(canonicalRuleId).not.toBe(detectorRuleId);
    }
  });

  it("maps detector ids to canonical school_rules ids when the profile owns the canonical rule", () => {
    const canonicalRuleId = resolveCanonicalRuleId({
      detectorRuleId: "REFERENCE_MISSING_DOI",
      profile: {
        school_id: "nku",
        rules_json: [{ ruleId: "canonical_reference_06" }],
        style_map: [],
      },
    });

    expect(canonicalRuleId).toBe("canonical_reference_06");
  });

  it("keeps detector ids when the selected profile does not expose a canonical target", () => {
    const mapping = resolveCanonicalRuleMapping({
      detectorRuleId: "REFERENCE_MISSING_DOI",
      profile: {
        school_id: "legacy",
        rules_json: [{ ruleId: "other_reference_rule" }],
        style_map: [],
      },
    });

    expect(mapping).toMatchObject({
      detectorRuleId: "REFERENCE_MISSING_DOI",
      canonicalRuleId: "canonical_reference_06",
      resolvedRuleId: "REFERENCE_MISSING_DOI",
      status: "missing_profile_rule",
    });
    expect(mapping.reason).toContain("finding_contract fallback");
    expect(resolveCanonicalRuleId({
      detectorRuleId: "REFERENCE_MISSING_DOI",
      profile: {
        school_id: "legacy",
        rules_json: [{ ruleId: "other_reference_rule" }],
        style_map: [],
      },
    })).toBe("REFERENCE_MISSING_DOI");
  });

  it("marks profiles without materialized rules as an explicit no_profile_rules degradation", () => {
    const mapping = resolveCanonicalRuleMapping({
      detectorRuleId: "REFERENCE_MISSING_DOI",
      profile: {
        school_id: "empty",
        rules_json: [],
        style_map: [],
      },
    });

    expect(mapping).toMatchObject({
      detectorRuleId: "REFERENCE_MISSING_DOI",
      canonicalRuleId: "canonical_reference_06",
      resolvedRuleId: "REFERENCE_MISSING_DOI",
      status: "no_profile_rules",
    });
  });

  it("preserves detectorRuleId so legacy rule detail grouping still works after canonicalization", () => {
    const [detection] = canonicalizeRuleDetections({
      detections: [makeDetection("REFERENCE_MISSING_DOI")],
      profile: {
        school_id: "nku",
        rules_json: [{ ruleId: "canonical_reference_06" }],
        style_map: [],
      },
    });

    expect(detection).toMatchObject({
      detectorRuleId: "REFERENCE_MISSING_DOI",
      ruleId: "canonical_reference_06",
      canonicalMapping: {
        detectorRuleId: "REFERENCE_MISSING_DOI",
        canonicalRuleId: "canonical_reference_06",
        resolvedRuleId: "canonical_reference_06",
        status: "mapped",
      },
    });

    const details = buildRuleDetailsFromDetections({
      sections: [],
      paragraphs: [],
      detections: [detection],
    });
    const referenceItems = details.find((detail) => detail.cat === "参考文献")?.items || [];

    expect(JSON.stringify(referenceItems)).toContain("canonical_reference_06");
  });
});
