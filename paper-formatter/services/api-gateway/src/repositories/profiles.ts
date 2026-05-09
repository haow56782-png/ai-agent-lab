import { query } from "../db.js";

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
  created_at: string;
  updated_at: string;
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await query<SchoolProfile>(
    `SELECT * FROM school_profiles ${where} ORDER BY school_id, version DESC`,
    values,
  );
  return result.rows;
}

export async function getProfile(profileId: string): Promise<SchoolProfile | null> {
  const result = await query<SchoolProfile>(
    "SELECT * FROM school_profiles WHERE school_id = $1",
    [profileId],
  );
  return result.rows[0] || null;
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
  if (q) {
    const result = await query<SchoolProfile>(
      `SELECT * FROM school_profiles WHERE name ILIKE $1 OR school_id ILIKE $1 ORDER BY upload_count DESC, name`,
      [`%${q}%`],
    );
    return result.rows;
  }
  const result = await query<SchoolProfile>(
    `SELECT * FROM school_profiles ORDER BY upload_count DESC, name`,
  );
  return result.rows;
}

export async function findProfileByName(name: string): Promise<SchoolProfile | null> {
  const result = await query<SchoolProfile>(
    `SELECT * FROM school_profiles WHERE name ILIKE $1 OR $1 ILIKE '%' || name || '%' LIMIT 1`,
    [name],
  );
  return result.rows[0] || null;
}

export async function findProfileById(schoolId: string): Promise<SchoolProfile | null> {
  const result = await query<SchoolProfile>(
    "SELECT * FROM school_profiles WHERE school_id = $1",
    [schoolId],
  );
  return result.rows[0] || null;
}

export async function incrementUploadCount(schoolId: string): Promise<void> {
  await query(
    `UPDATE school_profiles SET upload_count = upload_count + 1 WHERE school_id = $1`,
    [schoolId],
  );
}

export async function ensureSeedSchools(): Promise<void> {
  const existing = await query("SELECT COUNT(*) as cnt FROM school_profiles");
  if (parseInt(existing.rows[0].cnt as string, 10) > 0) return;

  const seeds = [
    { schoolId: "thu", name: "清华大学", faculty: "计算机科学与技术系", version: "v2024.09" },
    { schoolId: "pku", name: "北京大学", faculty: "元培学院 · 通用规范", version: "v2024.07" },
    { schoolId: "tjp", name: "同济大学", faculty: "软件学院", version: "v2024.03" },
    { schoolId: "fdu", name: "复旦大学", faculty: "管理学院", version: "v2024.01" },
    { schoolId: "cafa", name: "中央美术学院", faculty: "美术学系", version: "v2023.10" },
    { schoolId: "sjtu", name: "上海交通大学", faculty: "电子信息与电气工程学院", version: "v2024.05" },
    { schoolId: "cqccst", name: "重庆城市科技学院", faculty: "经济管理学院", version: "v2021.06" },
  ];

  for (const s of seeds) {
    await query(
      `INSERT INTO school_profiles (school_id, name, version, effective_from, faculty)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [s.schoolId, s.name, s.version, "2024-01-01", s.faculty],
    );
  }
  console.log("[seed] Inserted", seeds.length, "canonical school profiles");
}
