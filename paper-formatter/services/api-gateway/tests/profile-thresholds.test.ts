import { describe, expect, it } from "vitest";
import { CAFA_PROFILE_RULE_SAMPLE, getProfileRuleSample } from "../src/fixtures/profile-rule-samples.js";
import { resolveBodyStyleThresholds, resolveLayoutThresholds } from "../src/rules/profile-thresholds.js";

describe("profile threshold samples", () => {
  it("exposes repeatable cafa sample fixture", () => {
    const sample = getProfileRuleSample("cafa");
    expect(sample).toBeTruthy();
    expect(sample?.rulesJson.length).toBeGreaterThan(0);
    expect(sample?.styleMap.length).toBeGreaterThan(0);
  });

  it("resolves layout and body thresholds from cafa sample", () => {
    const layout = resolveLayoutThresholds({
      school_id: CAFA_PROFILE_RULE_SAMPLE.schoolId,
      rules_json: CAFA_PROFILE_RULE_SAMPLE.rulesJson,
      style_map: CAFA_PROFILE_RULE_SAMPLE.styleMap,
    });
    const body = resolveBodyStyleThresholds({
      school_id: CAFA_PROFILE_RULE_SAMPLE.schoolId,
      rules_json: CAFA_PROFILE_RULE_SAMPLE.rulesJson,
      style_map: CAFA_PROFILE_RULE_SAMPLE.styleMap,
    });

    expect(layout).toEqual({
      marginTopMm: 32,
      marginBottomMm: 27,
      marginLeftMm: 32,
      marginRightMm: 27,
      gutterMm: 10,
    });
    expect(body.allowedFonts).toEqual(["仿宋_GB2312", "Times New Roman"]);
    expect(body.lineSpacing).toBe(1.75);
    expect(body.firstLineIndentCm).toBe(0.74);
    expect(body.headingBeforePt).toBe(28);
    expect(body.headingAfterPt).toBe(20);
  });
});
