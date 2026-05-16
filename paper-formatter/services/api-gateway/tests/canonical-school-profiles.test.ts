import { describe, expect, it } from "vitest";
import { CANONICAL_PROFILE_SEEDS, resolveCanonicalProfileSeed } from "../src/fixtures/canonical-school-profiles.js";
import { REQUIRED_THESIS_SUBSETS } from "../src/fixtures/canonical-rule-catalog.js";
import { DETECTOR_TO_CANONICAL_RULE_ID } from "../src/rules/canonical-rule-map.js";

describe("canonical school profile registry", () => {
  it("resolves common aliases into canonical school ids", () => {
    expect(resolveCanonicalProfileSeed("南开")).toMatchObject({ schoolId: "nku", name: "南开大学" });
    expect(resolveCanonicalProfileSeed("中科大")).toMatchObject({ schoolId: "ustc", name: "中国科学技术大学" });
    expect(resolveCanonicalProfileSeed("北京师范大学")).toMatchObject({ schoolId: "bnu", name: "北京师范大学" });
    expect(resolveCanonicalProfileSeed("浙大")).toMatchObject({ schoolId: "zju", name: "浙江大学" });
    expect(resolveCanonicalProfileSeed("华科")).toMatchObject({ schoolId: "hust", name: "华中科技大学" });
    expect(resolveCanonicalProfileSeed("东华大学")).toMatchObject({ schoolId: "dhu", name: "东华大学" });
  });

  it("ships real rule payloads for seeded canonical profiles", () => {
    const lzu = CANONICAL_PROFILE_SEEDS.find((seed) => seed.schoolId === "lzu");
    expect(lzu?.rulesJson.length).toBeGreaterThan(80);
    expect(lzu?.styleMap.length).toBeGreaterThan(0);
    expect(lzu?.aliases).toContain("兰州大学");

    const dhu = CANONICAL_PROFILE_SEEDS.find((seed) => seed.schoolId === "dhu");
    expect(dhu?.rulesJson.length).toBeGreaterThan(80);
    expect(dhu?.styleMap.length).toBeGreaterThan(0);
    expect(dhu?.aliases).toContain("东华大学");
  });

  it("keeps approved canonical profiles complete enough for analyze thresholds", () => {
    const requiredRules = [
      "margin_top_mm",
      "margin_bottom_mm",
      "margin_left_mm",
      "margin_right_mm",
      "line_spacing",
    ];
    const requiredStyles = [
      "body_fonts",
      "first_line_indent_cm",
    ];

    for (const seed of CANONICAL_PROFILE_SEEDS) {
      expect(seed.aliases.length, `${seed.schoolId} aliases`).toBeGreaterThan(0);
      for (const ruleId of requiredRules) {
        expect(seed.rulesJson.some((rule) => rule.ruleId === ruleId), `${seed.schoolId} ${ruleId}`).toBe(true);
      }
      for (const ruleId of requiredStyles) {
        expect(seed.styleMap.some((rule) => rule.ruleId === ruleId), `${seed.schoolId} ${ruleId}`).toBe(true);
      }
    }
  });

  it("ships every detector canonical target rule in each school rule seed", () => {
    const requiredCanonicalRuleIds = [...new Set(Object.values(DETECTOR_TO_CANONICAL_RULE_ID))];

    for (const seed of CANONICAL_PROFILE_SEEDS) {
      const seedRuleIds = new Set([
        ...seed.rulesJson.map((rule) => String(rule.ruleId || "")),
        ...seed.styleMap.map((rule) => String(rule.ruleId || "")),
      ]);

      for (const ruleId of requiredCanonicalRuleIds) {
        expect(seedRuleIds.has(ruleId), `${seed.schoolId} missing canonical detector target ${ruleId}`).toBe(true);
      }
    }
  });

  it("keeps full rule catalogs categorized instead of shipping a ten-rule preview as the full profile", () => {
    const nku = resolveCanonicalProfileSeed("nku");
    expect(nku).toMatchObject({ schoolId: "nku", name: "南开大学" });

    const categories = new Set([
      ...(nku?.rulesJson || []).map((rule) => rule.category).filter(Boolean),
      ...(nku?.styleMap || []).map((rule) => rule.category).filter(Boolean),
    ]);

    expect((nku?.rulesJson.length || 0) + (nku?.styleMap.length || 0)).toBeGreaterThanOrEqual(90);
    expect(categories.size).toBeGreaterThanOrEqual(25);
    expect(categories).toContain("01. 页面与纸张");
    expect(categories).toContain("15. 表题");
    expect(categories).toContain("21. 参考文献");
  });

  it("aligns canonical rules to the full thesis object subset matrix", () => {
    const nku = resolveCanonicalProfileSeed("nku");
    const rules = [...(nku?.rulesJson || []), ...(nku?.styleMap || [])];
    const subsets = new Set(rules.map((rule) => rule.thesisSubset).filter(Boolean));

    for (const subset of REQUIRED_THESIS_SUBSETS) {
      expect(subsets.has(subset), `missing thesis subset ${subset}`).toBe(true);
    }

    for (const rule of rules) {
      expect(rule.targetObject, `${rule.ruleId} targetObject`).toBeTruthy();
      expect(rule.uiSection, `${rule.ruleId} uiSection`).toBeTruthy();
    }
  });

  it("uses concrete thesis-subset wording instead of vague template compliance copy", () => {
    const vagueCopyPattern = /符合学校要求|按学校模板|符合模板|模板设置|保持稳定|尽量|学校指定|学校要求/;

    for (const seed of CANONICAL_PROFILE_SEEDS) {
      const rules = [...seed.rulesJson, ...seed.styleMap];
      for (const rule of rules) {
        expect(rule.description || "", `${seed.schoolId} ${rule.ruleId}`).not.toMatch(vagueCopyPattern);
      }
    }
  });
});
