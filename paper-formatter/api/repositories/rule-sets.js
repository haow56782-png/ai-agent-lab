import { getPool, query } from "../db.js";
const DEFAULT_CATEGORY = "未分类规则";
const DEFAULT_THESIS_SUBSET = "unknown";
const DEFAULT_TARGET_OBJECT = "论文对象";
const DEFAULT_UI_SECTION = "规则";
function normalizeRuleId(rule, fallbackIndex) {
    return String(rule.ruleId || rule.rule_id || `rule_${String(fallbackIndex + 1).padStart(3, "0")}`);
}
function normalizeRuleName(rule, ruleId) {
    return String(rule.ruleName || rule.rule_name || rule.label || rule.description || ruleId);
}
function buildExpectedFormat(rule) {
    const expected = {};
    for (const key of ["value", "unit", "allowedFonts", "description", "expectedFormat"]) {
        if (rule[key] !== undefined && rule[key] !== null && rule[key] !== "") {
            expected[key] = rule[key];
        }
    }
    return expected;
}
function buildCondition(rule) {
    return {
        thesisSubset: rule.thesisSubset || DEFAULT_THESIS_SUBSET,
        targetObject: rule.targetObject || DEFAULT_TARGET_OBJECT,
        uiSection: rule.uiSection || DEFAULT_UI_SECTION,
    };
}
function numericCategoryCode(rule, fallbackIndex) {
    const value = Number.parseInt(String(rule.categoryCode || "").replace(/\D/g, ""), 10);
    if (Number.isFinite(value))
        return value * 1000 + fallbackIndex;
    return 999_000 + fallbackIndex;
}
function normalizeSchoolRule(input, rule, index, cacheKind) {
    const ruleId = normalizeRuleId(rule, index);
    const ruleName = normalizeRuleName(rule, ruleId);
    return {
        schoolId: input.schoolId,
        ruleId,
        ruleName,
        ruleSource: String(rule.source || "school"),
        ruleLevel: String(rule.ruleLevel || rule.source || "school"),
        ruleType: String(rule.type || rule.ruleType || "format"),
        cacheKind,
        category: String(rule.category || DEFAULT_CATEGORY),
        categoryCode: String(rule.categoryCode || ""),
        thesisSubset: String(rule.thesisSubset || DEFAULT_THESIS_SUBSET),
        targetObject: String(rule.targetObject || DEFAULT_TARGET_OBJECT),
        uiSection: String(rule.uiSection || DEFAULT_UI_SECTION),
        conditionJson: rule.condition && typeof rule.condition === "object" ? rule.condition : buildCondition(rule),
        expectedFormatJson: rule.expectedFormat && typeof rule.expectedFormat === "object"
            ? rule.expectedFormat
            : buildExpectedFormat(rule),
        priority: Number.isFinite(rule.priority) ? Number(rule.priority) : numericCategoryCode(rule, index),
        conflictPolicy: String(rule.conflictPolicy || "warn_on_conflict"),
        warningCode: String(rule.warningCode || `${ruleId}_CONFLICT`),
        fixable: rule.fixable === undefined ? true : Boolean(rule.fixable),
        autoFixStrategy: String(rule.autoFixStrategy || "profile_default"),
        evidenceJson: rule.evidence && typeof rule.evidence === "object"
            ? rule.evidence
            : { source: "school_profile", profileVersion: input.version },
        rawRuleJson: rule,
    };
}
export function buildSchoolRuleRows(input) {
    return [
        ...input.rulesJson.map((rule, index) => normalizeSchoolRule(input, rule, index, "rule")),
        ...input.styleMap.map((rule, index) => normalizeSchoolRule(input, rule, input.rulesJson.length + index, "style")),
    ];
}
export async function upsertRuleSetFromProfile(input) {
    const rows = buildSchoolRuleRows(input);
    const client = await getPool().connect();
    try {
        await client.query("BEGIN");
        const ruleSetResult = await client.query(`INSERT INTO school_rule_sets (
          school_id, school_name, version, effective_from, effective_to,
          source_type, source_hash, rules_cache, style_cache, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, NOW())
        ON CONFLICT (school_id, version) DO UPDATE
          SET school_name = EXCLUDED.school_name,
              effective_from = EXCLUDED.effective_from,
              effective_to = EXCLUDED.effective_to,
              source_type = EXCLUDED.source_type,
              source_hash = EXCLUDED.source_hash,
              rules_cache = EXCLUDED.rules_cache,
              style_cache = EXCLUDED.style_cache,
              updated_at = NOW()
        RETURNING rule_set_id`, [
            input.schoolId,
            input.schoolName,
            input.version,
            input.effectiveFrom,
            input.effectiveTo ?? null,
            input.sourceType || "seed",
            input.sourceHash ?? null,
            JSON.stringify(input.rulesJson),
            JSON.stringify(input.styleMap),
        ]);
        const ruleSetId = ruleSetResult.rows[0]?.rule_set_id;
        if (!ruleSetId) {
            throw new Error(`Unable to upsert school rule set for ${input.schoolId}@${input.version}`);
        }
        await client.query("DELETE FROM school_rules WHERE rule_set_id = $1", [ruleSetId]);
        for (const row of rows) {
            await client.query(`INSERT INTO school_rules (
            rule_set_id, school_id, rule_id, rule_name, rule_source, rule_level,
            rule_type, cache_kind, category, category_code, thesis_subset, target_object, ui_section,
            condition_json, expected_format_json, priority, conflict_policy, warning_code,
            fixable, auto_fix_strategy, evidence_json, raw_rule_json, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13,
            $14::jsonb, $15::jsonb, $16, $17, $18,
            $19, $20, $21::jsonb, $22::jsonb, NOW()
          )
          ON CONFLICT (rule_set_id, rule_id) DO UPDATE
            SET rule_name = EXCLUDED.rule_name,
                rule_source = EXCLUDED.rule_source,
                rule_level = EXCLUDED.rule_level,
                rule_type = EXCLUDED.rule_type,
                cache_kind = EXCLUDED.cache_kind,
                category = EXCLUDED.category,
                category_code = EXCLUDED.category_code,
                thesis_subset = EXCLUDED.thesis_subset,
                target_object = EXCLUDED.target_object,
                ui_section = EXCLUDED.ui_section,
                condition_json = EXCLUDED.condition_json,
                expected_format_json = EXCLUDED.expected_format_json,
                priority = EXCLUDED.priority,
                conflict_policy = EXCLUDED.conflict_policy,
                warning_code = EXCLUDED.warning_code,
                fixable = EXCLUDED.fixable,
                auto_fix_strategy = EXCLUDED.auto_fix_strategy,
                evidence_json = EXCLUDED.evidence_json,
                raw_rule_json = EXCLUDED.raw_rule_json,
                updated_at = NOW()`, [
                ruleSetId,
                row.schoolId,
                row.ruleId,
                row.ruleName,
                row.ruleSource,
                row.ruleLevel,
                row.ruleType,
                row.cacheKind,
                row.category,
                row.categoryCode,
                row.thesisSubset,
                row.targetObject,
                row.uiSection,
                JSON.stringify(row.conditionJson),
                JSON.stringify(row.expectedFormatJson),
                row.priority,
                row.conflictPolicy,
                row.warningCode,
                row.fixable,
                row.autoFixStrategy,
                JSON.stringify(row.evidenceJson),
                JSON.stringify(row.rawRuleJson),
            ]);
        }
        await client.query("COMMIT");
        return { ruleSetId, ruleCount: rows.length };
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
export async function createRuleSnapshot(input) {
    const result = await query(`INSERT INTO rule_snapshots (
        document_id, job_id, finding_id, school_id, rule_set_id,
        rule_id, rule_payload, snapshot_context
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
      RETURNING snapshot_id`, [
        input.documentId ?? null,
        input.jobId ?? null,
        input.findingId ?? null,
        input.schoolId,
        input.ruleSetId,
        input.ruleId,
        JSON.stringify(input.rulePayload),
        input.snapshotContext || "analyze",
    ]);
    return result.rows[0]?.snapshot_id || "";
}
export async function getLatestRuleSetForSchool(schoolId) {
    const result = await query(`SELECT rule_set_id, school_id, version
       FROM school_rule_sets
      WHERE school_id = $1
      ORDER BY effective_from DESC, updated_at DESC
      LIMIT 1`, [schoolId]);
    const row = result.rows[0];
    if (!row)
        return null;
    return {
        ruleSetId: row.rule_set_id,
        schoolId: row.school_id,
        version: row.version,
    };
}
export async function getProfileRulePayloadFromRuleTable(schoolId) {
    const ruleSet = await getLatestRuleSetForSchool(schoolId);
    if (!ruleSet)
        return null;
    const result = await query(`SELECT cache_kind, raw_rule_json
       FROM school_rules
      WHERE rule_set_id = $1
      ORDER BY priority ASC, rule_id ASC`, [ruleSet.ruleSetId]);
    return {
        ruleSetId: ruleSet.ruleSetId,
        rulesJson: result.rows.filter((row) => row.cache_kind !== "style").map((row) => row.raw_rule_json),
        styleMap: result.rows.filter((row) => row.cache_kind === "style").map((row) => row.raw_rule_json),
    };
}
export async function listRulesForSnapshot(params) {
    const uniqueRuleIds = [...new Set(params.ruleIds.filter(Boolean))];
    if (uniqueRuleIds.length === 0)
        return [];
    const ruleSet = await getLatestRuleSetForSchool(params.schoolId);
    if (!ruleSet)
        return [];
    const result = await query(`SELECT rule_id, raw_rule_json
       FROM school_rules
      WHERE rule_set_id = $1
        AND rule_id = ANY($2::varchar[])`, [ruleSet.ruleSetId, uniqueRuleIds]);
    return result.rows.map((row) => ({
        ruleSetId: ruleSet.ruleSetId,
        ruleId: row.rule_id,
        payload: row.raw_rule_json,
    }));
}
function getCanonicalMappingFromFinding(finding) {
    for (const span of finding.evidence_spans || []) {
        const mapping = span.metadata?.canonicalMapping;
        if (mapping && typeof mapping === "object") {
            return mapping;
        }
    }
    return undefined;
}
function buildFallbackRuleSnapshotPayload(finding) {
    const canonicalMapping = getCanonicalMappingFromFinding(finding);
    return {
        ruleId: finding.rule_id,
        ruleSnapshot: finding.rule_snapshot,
        source: "finding_contract",
        fallbackReason: String(canonicalMapping?.status || "missing_school_rule_snapshot"),
        fallbackMessage: String(canonicalMapping?.reason || `No school_rules row matched rule_id ${finding.rule_id}; using the finding contract snapshot.`),
        ...(canonicalMapping ? { canonicalMapping } : {}),
    };
}
export async function createAnalyzeRuleSnapshotsForFindings(input) {
    if (input.findings.length === 0)
        return [];
    const ruleSet = await getLatestRuleSetForSchool(input.schoolId);
    if (!ruleSet)
        return [];
    const matchedRules = await listRulesForSnapshot({
        schoolId: input.schoolId,
        ruleIds: input.findings.map((finding) => finding.rule_id),
    });
    const payloadByRuleId = new Map(matchedRules.map((rule) => [rule.ruleId, rule.payload]));
    return Promise.all(input.findings.map((finding) => createRuleSnapshot({
        documentId: input.documentId,
        jobId: input.jobId,
        findingId: finding.finding_id,
        schoolId: input.schoolId,
        ruleSetId: ruleSet.ruleSetId,
        ruleId: finding.rule_id,
        rulePayload: payloadByRuleId.get(finding.rule_id) || buildFallbackRuleSnapshotPayload(finding),
        snapshotContext: "analyze",
    })));
}
