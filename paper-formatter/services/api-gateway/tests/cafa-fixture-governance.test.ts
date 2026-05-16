import { describe, expect, it } from "vitest";
import { CAFA_ANCHORED_FIXTURES, cafaFixtureCoverageMatrix } from "../src/fixtures/cafa-caption-fixtures.js";
import { CAFA_P0_SCENARIO_TAGS } from "../src/fixtures/cafa-types.js";
import { CAFA_RULE_SEED, getCafaRuleIds } from "../src/fixtures/profile-rule-samples.js";

const INVALID_RULE_ID_TOKENS = ["unknown", "temp", "auto", "index"];
const INVALID_SCENARIO_TAGS = ["unknown", "misc", "general"];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

describe("CAFA fixture governance", () => {
  it("ensures CAFA seed ruleId values are stable and unique", () => {
    const ruleIds = getCafaRuleIds();
    expect(ruleIds.length).toBe(CAFA_RULE_SEED.rules.length);
    expect(unique(ruleIds)).toHaveLength(ruleIds.length);
    for (const ruleId of ruleIds) {
      expect(ruleId).toBeTruthy();
      expect(ruleId.startsWith("CAFA-")).toBe(true);
      expect(INVALID_RULE_ID_TOKENS.some((token) => ruleId.toLowerCase().includes(token))).toBe(false);
    }
  });

  it("ensures fixture and coverage matrix only reference seed ruleIds", () => {
    const seedRuleIds = new Set(getCafaRuleIds());
    for (const fixture of CAFA_ANCHORED_FIXTURES) {
      for (const relation of fixture.expectedRelations) {
        expect(seedRuleIds.has(relation.ruleId)).toBe(true);
      }
      for (const finding of fixture.expectedFindings || []) {
        expect(seedRuleIds.has(finding.ruleId)).toBe(true);
      }
    }
    for (const item of cafaFixtureCoverageMatrix) {
      for (const ruleId of item.ruleIds) {
        expect(seedRuleIds.has(ruleId)).toBe(true);
      }
    }
  });

  it("ensures fixtures carry non-empty scenario tags and cover all P0 tags", () => {
    const covered = new Set<string>();
    for (const fixture of CAFA_ANCHORED_FIXTURES) {
      expect(fixture.scenarioTags.length).toBeGreaterThan(0);
      for (const tag of fixture.scenarioTags) {
        expect(INVALID_SCENARIO_TAGS.includes(tag)).toBe(false);
        covered.add(tag);
      }
    }
    for (const tag of CAFA_P0_SCENARIO_TAGS) {
      expect(covered.has(tag)).toBe(true);
    }
  });

  it("ensures versions stay aligned across seed, fixtures, and coverage matrix", () => {
    for (const fixture of CAFA_ANCHORED_FIXTURES) {
      expect(fixture.school).toBe("CAFA");
      expect(fixture.ruleVersion).toBe(CAFA_RULE_SEED.ruleVersion);
      expect(fixture.fixtureVersion).toBe(CAFA_RULE_SEED.fixtureVersion);
      expect(fixture.baselineStandard).toBe(CAFA_RULE_SEED.baselineStandard);
    }
    for (const item of cafaFixtureCoverageMatrix) {
      expect(item.school).toBe("CAFA");
      expect(item.ruleVersion).toBe(CAFA_RULE_SEED.ruleVersion);
      expect(item.fixtureVersion).toBe(CAFA_RULE_SEED.fixtureVersion);
      expect(item.baselineStandard).toBe(CAFA_RULE_SEED.baselineStandard);
    }
  });

  it("ensures every fixture appears in coverage matrix with matching scenario tags", () => {
    const fixtureMap = new Map(CAFA_ANCHORED_FIXTURES.map((fixture) => [fixture.fixtureId, fixture]));
    expect(cafaFixtureCoverageMatrix).toHaveLength(CAFA_ANCHORED_FIXTURES.length);
    for (const fixture of CAFA_ANCHORED_FIXTURES) {
      const matrix = cafaFixtureCoverageMatrix.find((item) => item.fixtureId === fixture.fixtureId);
      expect(matrix).toBeTruthy();
      expect(matrix?.scenarioTags).toEqual(fixture.scenarioTags);
    }
    for (const matrix of cafaFixtureCoverageMatrix) {
      expect(fixtureMap.has(matrix.fixtureId)).toBe(true);
    }
  });

  it("ensures every CAFA figure/table caption ruleId is covered by at least one fixture", () => {
    const coveredRuleIds = new Set(cafaFixtureCoverageMatrix.flatMap((item) => item.ruleIds));
    for (const rule of CAFA_RULE_SEED.rules) {
      if (rule.category === "figureCaption" || rule.category === "tableCaption" || rule.target === "caption") {
        expect(coveredRuleIds.has(rule.ruleId)).toBe(true);
      }
    }
  });
});
