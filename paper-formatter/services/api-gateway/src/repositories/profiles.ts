import { getPool, query } from "../db.js";
import { PROFILE_RULE_SAMPLES } from "../fixtures/profile-rule-samples.js";
import {
  CANONICAL_PROFILE_SEEDS,
  resolveCanonicalProfileSeed,
  type CanonicalProfileSeed,
} from "../fixtures/canonical-school-profiles.js";
import { getProfileRulePayloadFromRuleTable, upsertRuleSetFromProfile } from "./rule-sets.js";

export interface SchoolProfile {
  id: string;
  school_id: string;
  name: string;
  version: string;
  effective_from: string;
  effective_to: string | null;
  faculty: string | null;
  major: string | null;
  gb_version: string;
  rules_json: any[];
  style_map: any[];
  source_type: string;
  source_hash: string | null;
  upload_count: number;
  recent_usage_count_7d?: number;
  recent_hit_rate_7d?: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

const ARCHIVED_DETECTED_SOURCE_TYPE = "archived_detected";
const INVALID_DETECTED_NAME_TOKENS = ["学生所属学院", "学生所在学院", "学生所属院系", "所属学院", "所属院系"];

function normalizeSchoolName(value: string): string {
  return value.replace(/[·•\s　（）()]/g, "").trim().toLowerCase();
}

function isInvalidDetectedSchoolName(name: string | null | undefined): boolean {
  const normalized = normalizeSchoolName(name || "");
  if (!normalized) return true;
  return INVALID_DETECTED_NAME_TOKENS.some((token) => normalized.includes(normalizeSchoolName(token)));
}

export async function searchProfiles(params: {
  schoolId?: string;
  faculty?: string;
  major?: string;
}): Promise<SchoolProfile[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.schoolId) {
    conditions.push(`school_id ILIKE $${idx++}`);
    values.push(`%${params.schoolId}%`);
  }
  if (params.faculty) {
    conditions.push(`faculty ILIKE $${idx++}`);
    values.push(`%${params.faculty}%`);
  }
  if (params.major) {
    conditions.push(`major ILIKE $${idx++}`);
    values.push(`%${params.major}%`);
  }

  conditions.push(`source_type <> $${idx++}`);
  values.push(ARCHIVED_DETECTED_SOURCE_TYPE);
  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await query<SchoolProfile>(
    `SELECT * FROM school_profiles ${where} ORDER BY school_id, version DESC`,
    values,
  );
  return collapseProfiles(result.rows);
}

export async function getProfile(profileId: string): Promise<SchoolProfile | null> {
  const canonicalSeed = resolveCanonicalProfileSeed(profileId);
  if (canonicalSeed) {
    const profile = await ensureCanonicalProfile(canonicalSeed);
    return hydrateProfileRulesFromRuleTable(profile);
  }

  const result = await query<SchoolProfile>(
    "SELECT * FROM school_profiles WHERE school_id = $1 AND source_type <> $2",
    [profileId, ARCHIVED_DETECTED_SOURCE_TYPE],
  );
  return hydrateProfileRulesFromRuleTable(result.rows[0] || null);
}

export async function getProfileRules(profileId: string): Promise<Pick<SchoolProfile, "school_id" | "rules_json" | "style_map"> | null> {
  const canonicalSeed = resolveCanonicalProfileSeed(profileId);
  if (canonicalSeed) {
    const profile = await hydrateProfileRulesFromRuleTable(await ensureCanonicalProfile(canonicalSeed));
    return {
      school_id: profile.school_id,
      rules_json: profile.rules_json,
      style_map: profile.style_map,
    };
  }

  const result = await query<Pick<SchoolProfile, "school_id" | "rules_json" | "style_map">>(
    "SELECT school_id, rules_json, style_map FROM school_profiles WHERE school_id = $1 AND source_type <> $2",
    [profileId, ARCHIVED_DETECTED_SOURCE_TYPE],
  );
  const row = result.rows[0] || null;
  if (!row) return null;
  const rulePayload = await getProfileRulePayloadFromRuleTable(row.school_id).catch(() => null);
  if (!rulePayload) return row;
  return {
    ...row,
    rules_json: rulePayload.rulesJson,
    style_map: rulePayload.styleMap,
  };
}

export async function createProfile(record: {
  schoolId: string;
  name: string;
  version: string;
  effectiveFrom: string;
  faculty?: string;
  major?: string;
  rulesJson?: any[];
  styleMap?: any[];
  sourceType?: string;
}): Promise<SchoolProfile> {
  const result = await query<SchoolProfile>(
    `INSERT INTO school_profiles (school_id, name, version, effective_from, faculty, major, rules_json, style_map, source_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      record.schoolId,
      record.name,
      record.version,
      record.effectiveFrom,
      record.faculty ?? null,
      record.major ?? null,
      JSON.stringify(record.rulesJson ?? []),
      JSON.stringify(record.styleMap ?? []),
      record.sourceType ?? "manual",
    ],
  );
  return result.rows[0];
}

export async function listProfiles(q?: string): Promise<SchoolProfile[]> {
  const statsSelect = `
    SELECT p.*,
           COALESCE(profile_stats.recent_usage_count_7d, 0)::int AS recent_usage_count_7d,
           CASE
             WHEN recent_totals.total_recent_7d > 0
               THEN ROUND((COALESCE(profile_stats.recent_usage_count_7d, 0)::numeric / recent_totals.total_recent_7d::numeric), 4)::float
             ELSE 0
           END AS recent_hit_rate_7d,
           profile_stats.last_used_at
      FROM school_profiles p
      CROSS JOIN (
        SELECT COUNT(*)::int AS total_recent_7d
          FROM document_profiles
         WHERE created_at >= NOW() - INTERVAL '7 days'
      ) AS recent_totals
      LEFT JOIN (
        SELECT school_id,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recent_usage_count_7d,
               MAX(created_at) AS last_used_at
          FROM document_profiles
         GROUP BY school_id
      ) AS profile_stats
        ON profile_stats.school_id = p.school_id
  `;
  if (q) {
    const result = await query<SchoolProfile>(
      `${statsSelect}
        WHERE (p.name ILIKE $1 OR p.school_id ILIKE $1)
          AND source_type <> $2
        ORDER BY p.upload_count DESC, p.name`,
      [`%${q}%`, ARCHIVED_DETECTED_SOURCE_TYPE],
    );
    return collapseProfiles(result.rows);
  }
  const result = await query<SchoolProfile>(
    `${statsSelect}
      WHERE p.source_type <> $1
      ORDER BY p.upload_count DESC, p.name`,
    [ARCHIVED_DETECTED_SOURCE_TYPE],
  );
  return collapseProfiles(result.rows);
}

export async function findProfileByName(name: string): Promise<SchoolProfile | null> {
  const result = await query<SchoolProfile>(
    `SELECT * FROM school_profiles
      WHERE (name ILIKE $1 OR $1 ILIKE '%' || name || '%')
        AND source_type <> $2
      LIMIT 1`,
    [name, ARCHIVED_DETECTED_SOURCE_TYPE],
  );
  return result.rows[0] || null;
}

function hasRulePayload(profile: Pick<SchoolProfile, "rules_json" | "style_map"> | null | undefined): boolean {
  return Array.isArray(profile?.rules_json) && profile.rules_json.length > 0
    || Array.isArray(profile?.style_map) && profile.style_map.length > 0;
}

async function hydrateProfileRulesFromRuleTable<T extends SchoolProfile | null>(profile: T): Promise<T> {
  if (!profile) return profile;
  const rulePayload = await getProfileRulePayloadFromRuleTable(profile.school_id).catch(() => null);
  if (!rulePayload) return profile;
  return {
    ...profile,
    rules_json: rulePayload.rulesJson,
    style_map: rulePayload.styleMap,
  };
}

function rankProfileMatch(profile: SchoolProfile): number {
  let score = 0;
  if (hasRulePayload(profile)) score += 100;
  if (profile.source_type === "seed" || profile.source_type === "official") score += 40;
  if (profile.source_type === "detected") score -= 20;
  score += Math.min(profile.recent_usage_count_7d || 0, 20) * 2;
  score += Math.round((profile.recent_hit_rate_7d || 0) * 10);
  score += Math.min(profile.upload_count || 0, 20);
  return score;
}

function collapseProfiles(profiles: SchoolProfile[]): SchoolProfile[] {
  const byName = new Map<string, SchoolProfile>();
  for (const profile of profiles) {
    const key = normalizeSchoolName(profile.name || profile.school_id);
    const current = byName.get(key);
    if (!current || rankProfileMatch(profile) > rankProfileMatch(current)) {
      byName.set(key, profile);
    }
  }
  return [...byName.values()].sort((left, right) => {
    const scoreDiff = rankProfileMatch(right) - rankProfileMatch(left);
    if (scoreDiff !== 0) return scoreDiff;
    const recentUsageDiff = (right.recent_usage_count_7d || 0) - (left.recent_usage_count_7d || 0);
    if (recentUsageDiff !== 0) return recentUsageDiff;
    const recentHitRateDiff = (right.recent_hit_rate_7d || 0) - (left.recent_hit_rate_7d || 0);
    if (recentHitRateDiff !== 0) return recentHitRateDiff;
    const recentTimeDiff = new Date(right.last_used_at || 0).getTime() - new Date(left.last_used_at || 0).getTime();
    if (recentTimeDiff !== 0) return recentTimeDiff;
    return (right.upload_count || 0) - (left.upload_count || 0);
  });
}

export function resolveCanonicalSeedByName(name: string): CanonicalProfileSeed | null {
  return resolveCanonicalProfileSeed(name);
}

export async function ensureCanonicalProfile(seed: CanonicalProfileSeed): Promise<SchoolProfile> {
  const existing = await findProfileById(seed.schoolId);
  if (!existing) {
    const created = await createProfile({
      schoolId: seed.schoolId,
      name: seed.name,
      version: seed.version,
      effectiveFrom: seed.effectiveFrom,
      faculty: seed.faculty,
      rulesJson: seed.rulesJson,
      styleMap: seed.styleMap,
      sourceType: "seed",
    });
    await upsertRuleSetFromProfile({
      schoolId: seed.schoolId,
      schoolName: seed.name,
      version: seed.version,
      effectiveFrom: seed.effectiveFrom,
      sourceType: "seed",
      rulesJson: seed.rulesJson,
      styleMap: seed.styleMap,
    });
    return created;
  }

  const shouldNormalizeSourceType = existing.source_type === "manual" || existing.source_type === "detected";
  const shouldRefreshRulePayload = hasRulePayload(existing) && (
    JSON.stringify(existing.rules_json || []) !== JSON.stringify(seed.rulesJson)
    || JSON.stringify(existing.style_map || []) !== JSON.stringify(seed.styleMap)
  );
  if (!hasRulePayload(existing) || shouldNormalizeSourceType || shouldRefreshRulePayload) {
    const result = await query<SchoolProfile>(
      `UPDATE school_profiles
          SET name = $2,
              version = $3,
              effective_from = $4,
              faculty = COALESCE(faculty, $5),
              rules_json = $6::jsonb,
              style_map = $7::jsonb,
              source_type = CASE WHEN source_type IN ('detected', 'manual') THEN 'seed' ELSE source_type END,
              updated_at = NOW()
        WHERE school_id = $1
        RETURNING *`,
      [
        seed.schoolId,
        seed.name,
        seed.version,
        seed.effectiveFrom,
        seed.faculty,
        JSON.stringify(seed.rulesJson),
        JSON.stringify(seed.styleMap),
      ],
    );
    const updated = result.rows[0];
    await upsertRuleSetFromProfile({
      schoolId: seed.schoolId,
      schoolName: seed.name,
      version: seed.version,
      effectiveFrom: seed.effectiveFrom,
      sourceType: updated.source_type || "seed",
      sourceHash: updated.source_hash,
      rulesJson: seed.rulesJson,
      styleMap: seed.styleMap,
    });
    return updated;
  }

  await upsertRuleSetFromProfile({
    schoolId: seed.schoolId,
    schoolName: seed.name,
    version: seed.version,
    effectiveFrom: seed.effectiveFrom,
    sourceType: existing.source_type || "seed",
    sourceHash: existing.source_hash,
    rulesJson: seed.rulesJson,
    styleMap: seed.styleMap,
  });
  return existing;
}

export async function findBestProfileByName(name: string): Promise<SchoolProfile | null> {
  const canonicalSeed = resolveCanonicalProfileSeed(name);
  if (canonicalSeed) {
    return ensureCanonicalProfile(canonicalSeed);
  }

  const result = await query<SchoolProfile>(
    `SELECT * FROM school_profiles
      WHERE (name ILIKE $1 OR $1 ILIKE '%' || name || '%')
        AND source_type <> $2
      ORDER BY upload_count DESC, updated_at DESC`,
    [name, ARCHIVED_DETECTED_SOURCE_TYPE],
  );
  if (result.rows.length === 0) return null;
  return result.rows.sort((left, right) => rankProfileMatch(right) - rankProfileMatch(left))[0] || null;
}

export async function findProfileById(schoolId: string): Promise<SchoolProfile | null> {
  const result = await query<SchoolProfile>(
    "SELECT * FROM school_profiles WHERE school_id = $1 AND source_type <> $2",
    [schoolId, ARCHIVED_DETECTED_SOURCE_TYPE],
  );
  return result.rows[0] || null;
}

export async function incrementUploadCount(schoolId: string): Promise<void> {
  await query(
    `UPDATE school_profiles SET upload_count = upload_count + 1 WHERE school_id = $1`,
    [schoolId],
  );
}

function isEmptyRulePayload(value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0;
}

export async function ensureSeedProfileSamples(): Promise<void> {
  for (const sample of PROFILE_RULE_SAMPLES) {
    const existing = await query<Pick<SchoolProfile, "school_id" | "rules_json" | "style_map">>(
      `SELECT school_id, rules_json, style_map
         FROM school_profiles
        WHERE school_id = $1
        ORDER BY effective_from DESC
        LIMIT 1`,
      [sample.schoolId],
    );

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO school_profiles (school_id, name, version, effective_from, faculty, rules_json, style_map, source_type)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
        [
          sample.schoolId,
          sample.name,
          sample.version,
          sample.effectiveFrom,
          sample.faculty ?? null,
          JSON.stringify(sample.rulesJson),
          JSON.stringify(sample.styleMap),
          "seed",
        ],
      );
      continue;
    }

    const row = existing.rows[0];
    if (!isEmptyRulePayload(row.rules_json) && !isEmptyRulePayload(row.style_map)) {
      continue;
    }

    await query(
      `UPDATE school_profiles
          SET rules_json = CASE WHEN rules_json = '[]'::jsonb THEN $2::jsonb ELSE rules_json END,
              style_map = CASE WHEN style_map = '[]'::jsonb THEN $3::jsonb ELSE style_map END,
              updated_at = NOW()
        WHERE school_id = $1`,
      [sample.schoolId, JSON.stringify(sample.rulesJson), JSON.stringify(sample.styleMap)],
    );
  }
}

export async function ensureSeedSchools(): Promise<void> {
  console.log("[seed] Checking existing school profiles...");
  const existing = await query("SELECT COUNT(*) as cnt FROM school_profiles");
  const cnt = parseInt(existing.rows[0].cnt as string, 10);
  console.log(`[seed] Found ${cnt} existing profiles`);
  if (cnt > 0) {
    await ensureSeedProfileSamples();
    console.log("[seed] Profile samples ensured");
    for (const seed of CANONICAL_PROFILE_SEEDS) {
      await ensureCanonicalProfile(seed);
    }
    console.log(`[seed] ${CANONICAL_PROFILE_SEEDS.length} canonical profiles updated`);
    return;
  }

  for (const seed of CANONICAL_PROFILE_SEEDS) {
    await ensureCanonicalProfile(seed);
  }
  await ensureSeedProfileSamples();
  console.log("[seed] Inserted", CANONICAL_PROFILE_SEEDS.length, "canonical school profiles");
}

export async function normalizeCanonicalProfileSourceTypes(): Promise<number> {
  let normalized = 0;
  for (const seed of CANONICAL_PROFILE_SEEDS) {
    const before = await findProfileById(seed.schoolId);
    if (!before) continue;
    const shouldNormalize = before.source_type === "manual" || before.source_type === "detected";
    const after = await ensureCanonicalProfile(seed);
    if (shouldNormalize && after.source_type === "seed") {
      normalized += 1;
    }
  }
  return normalized;
}

export async function migrateLegacyDetectedProfiles(): Promise<{
  migratedProfiles: number;
  migratedDocumentLinks: number;
}> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const legacyProfiles = await client.query<SchoolProfile>(
      `SELECT * FROM school_profiles
        WHERE source_type = 'detected'
        ORDER BY upload_count DESC, updated_at DESC`,
    );

    let migratedProfiles = 0;
    let migratedDocumentLinks = 0;

    for (const legacy of legacyProfiles.rows) {
      if (isInvalidDetectedSchoolName(legacy.name)) {
        await client.query(
          `UPDATE school_profiles
              SET source_type = $2,
                  upload_count = 0,
                  updated_at = NOW()
            WHERE school_id = $1`,
          [legacy.school_id, ARCHIVED_DETECTED_SOURCE_TYPE],
        );
        migratedProfiles += 1;
        continue;
      }

      const canonicalSeed = resolveCanonicalProfileSeed(legacy.name);
      if (!canonicalSeed || canonicalSeed.schoolId === legacy.school_id) {
        continue;
      }

      const canonicalResult = await client.query<SchoolProfile>(
        `SELECT * FROM school_profiles
          WHERE school_id = $1
          LIMIT 1`,
        [canonicalSeed.schoolId],
      );
      if (canonicalResult.rows.length === 0) continue;

      const canonical = canonicalResult.rows[0];
      const docLinks = await client.query<{ doc_id: string | null; confidence: number | null }>(
        `SELECT doc_id, confidence
           FROM document_profiles
          WHERE school_id = $1`,
        [legacy.school_id],
      );

      for (const link of docLinks.rows) {
        if (!link.doc_id) continue;
        const inserted = await client.query(
          `INSERT INTO document_profiles (doc_id, school_id, profile_id, confidence)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (doc_id, school_id) DO NOTHING`,
          [link.doc_id, canonical.school_id, canonical.school_id, link.confidence],
        );
        migratedDocumentLinks += inserted.rowCount || 0;
      }

      await client.query(`DELETE FROM document_profiles WHERE school_id = $1`, [legacy.school_id]);

      if ((legacy.upload_count || 0) > 0) {
        await client.query(
          `UPDATE school_profiles
              SET upload_count = upload_count + $2,
                  updated_at = NOW()
            WHERE school_id = $1`,
          [canonical.school_id, legacy.upload_count],
        );
      }

      await client.query(
        `UPDATE school_profiles
            SET source_type = $2,
                upload_count = 0,
                updated_at = NOW()
          WHERE school_id = $1`,
        [legacy.school_id, ARCHIVED_DETECTED_SOURCE_TYPE],
      );

      migratedProfiles += 1;
    }

    await client.query("COMMIT");
    return { migratedProfiles, migratedDocumentLinks };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
