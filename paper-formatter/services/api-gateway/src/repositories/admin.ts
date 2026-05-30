import { query } from "../db.js";

export type AdminOperation = "create" | "read" | "update" | "delete";

export interface AdminOperationCapability {
  enabled: boolean;
  label: string;
  endpoint?: string;
  reason?: string;
}

export interface AdminDomainSummary {
  id: string;
  navLabel: string;
  title: string;
  subtitle: string;
  icon: string;
  tables: string[];
  positioning: string;
  lifecycle: string[];
  primaryKey: string;
  operations: Record<AdminOperation, AdminOperationCapability>;
}

export interface AdminRecordRow {
  id: string;
  name: string;
  status: string;
  owner: string;
  evidence: string;
}

export interface AdminOverview {
  domains: AdminDomainSummary[];
  tables: string[];
  flowSteps: string[];
  capabilityTotals: {
    enabled: number;
    total: number;
  };
  tableCounts: Record<string, number>;
}

export const ADMIN_TABLES = [
  "audit_records",
  "document_profiles",
  "documents",
  "findings",
  "jobs",
  "rule_snapshots",
  "school_profiles",
  "school_rule_sets",
  "school_rules",
  "share_reports",
] as const;

export const ADMIN_DOMAINS: AdminDomainSummary[] = [
  {
    id: "documents",
    navLabel: "文档管理",
    title: "F1 文档管理域",
    subtitle: "论文文档全生命周期 + 规范绑定",
    icon: "▣",
    tables: ["documents", "document_profiles"],
    positioning: "上传文档、查看元数据、绑定学校规则包，并为后续任务提供 document_id。",
    lifecycle: ["草稿", "ready", "online", "归档"],
    primaryKey: "document_id / doc_id",
    operations: {
      create: { enabled: true, label: "新增文档", endpoint: "POST /api/v1/documents" },
      read: { enabled: true, label: "查询文档", endpoint: "GET /api/v1/documents/:docId" },
      update: { enabled: false, label: "编辑绑定", reason: "生产接口缺少 document_profiles 绑定更新端点，不能伪造写入。" },
      delete: { enabled: false, label: "删除文档", reason: "文档已关联 jobs/findings/share_reports，生产环境应先实现归档与依赖检查。" },
    },
  },
  {
    id: "rules",
    navLabel: "规则配置",
    title: "F2 规则配置域",
    subtitle: "学校规范 → 规则包 → 规则明细 → 快照冻结",
    icon: "◇",
    tables: ["school_profiles", "school_rule_sets", "school_rules", "rule_snapshots"],
    positioning: "管理学校规范库、规则包版本、规则明细分类，并在任务执行前冻结快照。",
    lifecycle: ["draft", "reviewing", "online", "snapshot"],
    primaryKey: "school_id / rule_set_id / rule_id",
    operations: {
      create: { enabled: true, label: "补充模板", endpoint: "POST /api/v1/profiles/import-template" },
      read: { enabled: true, label: "查询规则", endpoint: "GET /api/v1/profiles + GET /api/v1/profiles/:profileId" },
      update: { enabled: false, label: "编辑规则", reason: "直接编辑 school_rules 需要版本草稿、审批和发布接口；当前只能通过模板导入生成草案。" },
      delete: { enabled: false, label: "删除规则", reason: "rule_snapshots 只增不改；线上规则不能硬删除，应走停用/新版本发布。" },
    },
  },
  {
    id: "tasks",
    navLabel: "任务执行",
    title: "F3 任务执行域",
    subtitle: "排版任务调度 + 检查发现项处理",
    icon: "◎",
    tables: ["jobs", "findings"],
    positioning: "承载 Step3→Step5：任务状态机、发现项工作台、重试/取消边界和人工确认。",
    lifecycle: ["pending", "running", "guarded", "done", "failed"],
    primaryKey: "job_id / finding_id",
    operations: {
      create: { enabled: true, label: "创建任务", endpoint: "POST /api/v1/jobs/analyze|fix|format" },
      read: { enabled: true, label: "查询任务", endpoint: "GET /api/v1/jobs/:jobId + GET /api/v1/findings" },
      update: { enabled: true, label: "处理发现项", endpoint: "POST /api/v1/findings/:id/accept|reject|self-edit" },
      delete: { enabled: false, label: "删除发现项", reason: "发现项必须保留审计链路；生产动作应是 accept/reject/self-edit/exempt，而非物理删除。" },
    },
  },
  {
    id: "delivery",
    navLabel: "交付分享",
    title: "F4 交付分享域",
    subtitle: "报告生成与对外分享",
    icon: "◈",
    tables: ["share_reports"],
    positioning: "关联文档、发现项和报告 payload，管理分享链接权限与有效期。",
    lifecycle: ["generated", "active", "expired"],
    primaryKey: "share_id",
    operations: {
      create: { enabled: true, label: "生成报告", endpoint: "POST /api/v1/share/report" },
      read: { enabled: true, label: "查看报告", endpoint: "GET /api/v1/share/report/:shareId" },
      update: { enabled: false, label: "编辑权限", reason: "分享有效期/权限字段尚未入库，不能做假开关。" },
      delete: { enabled: false, label: "删除分享", reason: "生产应实现撤销/失效接口并写 audit_records。" },
    },
  },
  {
    id: "audit",
    navLabel: "审计治理",
    title: "F5 审计治理域",
    subtitle: "全链路操作留痕，只读追溯",
    icon: "◉",
    tables: ["audit_records"],
    positioning: "记录对象、操作人、动作、状态迁移和快照引用。审计域只读，不提供修改入口。",
    lifecycle: ["append_only", "searchable", "exportable"],
    primaryKey: "audit_id",
    operations: {
      create: { enabled: false, label: "新增审计", reason: "审计记录只能由业务动作自动写入，禁止人工新增。" },
      read: { enabled: true, label: "查询审计", endpoint: "GET /api/v1/admin/audit-records" },
      update: { enabled: false, label: "编辑审计", reason: "审计记录不可变。" },
      delete: { enabled: false, label: "删除审计", reason: "审计记录不可删除。" },
    },
  },
];

export const ADMIN_FLOW_STEPS = [
  "documents 上传文档",
  "document_profiles 绑定规则包",
  "rule_snapshots 冻结规则",
  "jobs 创建排版任务",
  "findings 跑出发现项",
  "share_reports 生成分享报告",
  "audit_records 全程留痕",
];

function capabilityTotals() {
  const allCapabilities = ADMIN_DOMAINS.flatMap((domain) => Object.values(domain.operations));
  return {
    enabled: allCapabilities.filter((capability) => capability.enabled).length,
    total: allCapabilities.length,
  };
}

function safeLimit(limit?: number) {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(100, Math.max(1, Math.floor(limit || 20)));
}

function likePattern(search?: string) {
  return `%${String(search || "").trim()}%`;
}

export async function getOverview(): Promise<AdminOverview> {
  const result = await query<Record<string, number | string>>(
    `SELECT
      (SELECT COUNT(*)::int FROM audit_records) AS audit_records,
      (SELECT COUNT(*)::int FROM document_profiles) AS document_profiles,
      (SELECT COUNT(*)::int FROM documents) AS documents,
      (SELECT COUNT(*)::int FROM findings) AS findings,
      (SELECT COUNT(*)::int FROM jobs) AS jobs,
      (SELECT COUNT(*)::int FROM rule_snapshots) AS rule_snapshots,
      (SELECT COUNT(*)::int FROM school_profiles) AS school_profiles,
      (SELECT COUNT(*)::int FROM school_rule_sets) AS school_rule_sets,
      (SELECT COUNT(*)::int FROM school_rules) AS school_rules,
      (SELECT COUNT(*)::int FROM share_reports) AS share_reports`,
  );
  const row = result.rows[0] || {};
  const tableCounts = Object.fromEntries(ADMIN_TABLES.map((table) => [table, Number(row[table] || 0)]));
  return {
    domains: ADMIN_DOMAINS,
    tables: [...ADMIN_TABLES],
    flowSteps: ADMIN_FLOW_STEPS,
    capabilityTotals: capabilityTotals(),
    tableCounts,
  };
}

export async function listDomainRecords(domainId: string, params: { search?: string; limit?: number } = {}): Promise<AdminRecordRow[]> {
  const limit = safeLimit(params.limit);
  const search = String(params.search || "").trim();
  const pattern = likePattern(search);

  if (domainId === "documents") {
    const result = await query<AdminRecordRow>(
      `SELECT d.doc_id AS id,
              d.filename AS name,
              COALESCE(dp.school_id, 'unbound') AS status,
              'documents' AS owner,
              CONCAT('sha256=', LEFT(d.sha256, 10), ' · canonical=', d.canonical_document_id) AS evidence
         FROM documents d
         LEFT JOIN document_profiles dp ON dp.doc_id = d.doc_id
        WHERE ($1 = '' OR d.doc_id ILIKE $2 OR d.filename ILIKE $2 OR COALESCE(dp.school_id, '') ILIKE $2)
        ORDER BY d.created_at DESC
        LIMIT $3`,
      [search, pattern, limit],
    );
    return result.rows;
  }

  if (domainId === "rules") {
    const result = await query<AdminRecordRow>(
      `(SELECT rule_set_id::text AS id,
               CONCAT(school_name, ' ', version) AS name,
               source_type AS status,
               'school_rule_sets' AS owner,
               CONCAT('school_id=', school_id, ' · rules=', jsonb_array_length(rules_cache)) AS evidence,
               updated_at AS sort_time
          FROM school_rule_sets
         WHERE ($1 = '' OR school_id ILIKE $2 OR school_name ILIKE $2 OR version ILIKE $2))
       UNION ALL
       (SELECT rule_pk::text AS id,
               rule_name AS name,
               rule_level AS status,
               'school_rules' AS owner,
               CONCAT('rule_id=', rule_id, ' · source=', rule_source) AS evidence,
               updated_at AS sort_time
          FROM school_rules
         WHERE ($1 = '' OR rule_id ILIKE $2 OR rule_name ILIKE $2 OR category ILIKE $2))
       UNION ALL
       (SELECT snapshot_id::text AS id,
               CONCAT('snapshot ', rule_id) AS name,
               snapshot_context AS status,
               'rule_snapshots' AS owner,
               CONCAT('job_id=', COALESCE(job_id, '-'), ' · finding_id=', COALESCE(finding_id, '-')) AS evidence,
               created_at AS sort_time
          FROM rule_snapshots
         WHERE ($1 = '' OR rule_id ILIKE $2 OR school_id ILIKE $2 OR COALESCE(job_id, '') ILIKE $2))
       ORDER BY sort_time DESC
       LIMIT $3`,
      [search, pattern, limit],
    );
    return result.rows;
  }

  if (domainId === "tasks") {
    const result = await query<AdminRecordRow>(
      `(SELECT job_id AS id,
               job_type AS name,
               status,
               'jobs' AS owner,
               CONCAT('doc_id=', COALESCE(doc_id, '-'), ' · progress=', progress::text) AS evidence,
               created_at AS sort_time
          FROM jobs
         WHERE ($1 = '' OR job_id ILIKE $2 OR job_type ILIKE $2 OR status ILIKE $2 OR COALESCE(doc_id, '') ILIKE $2))
       UNION ALL
       (SELECT finding_id AS id,
               rule_id AS name,
               status,
               'findings' AS owner,
               CONCAT('document_id=', document_id, ' · severity=', severity) AS evidence,
               created_at AS sort_time
          FROM findings
         WHERE ($1 = '' OR finding_id ILIKE $2 OR rule_id ILIKE $2 OR status ILIKE $2 OR document_id ILIKE $2))
       ORDER BY sort_time DESC
       LIMIT $3`,
      [search, pattern, limit],
    );
    return result.rows;
  }

  if (domainId === "delivery") {
    const result = await query<AdminRecordRow>(
      `SELECT share_id AS id,
              COALESCE(payload_json->>'shareTitle', share_id) AS name,
              'active' AS status,
              'share_reports' AS owner,
              CONCAT('doc_id=', COALESCE(doc_id, '-'), ' · source_job_id=', COALESCE(source_job_id, '-')) AS evidence
         FROM share_reports
        WHERE ($1 = '' OR share_id ILIKE $2 OR COALESCE(doc_id, '') ILIKE $2 OR COALESCE(source_job_id, '') ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3`,
      [search, pattern, limit],
    );
    return result.rows;
  }

  if (domainId === "audit") {
    return listAuditRecords({ search, limit });
  }

  throw new Error(`Unknown admin domain: ${domainId}`);
}

export async function listAuditRecords(params: { search?: string; limit?: number } = {}): Promise<AdminRecordRow[]> {
  const limit = safeLimit(params.limit);
  const search = String(params.search || "").trim();
  const pattern = likePattern(search);
  const result = await query<AdminRecordRow>(
    `SELECT audit_id AS id,
            CONCAT(action, ' ', target_type) AS name,
            COALESCE(to_state, action) AS status,
            'audit_records' AS owner,
            CONCAT('target_id=', target_id, ' · actor=', actor_id) AS evidence
       FROM audit_records
      WHERE ($1 = ''
         OR audit_id ILIKE $2
         OR target_type ILIKE $2
         OR target_id ILIKE $2
         OR actor_id ILIKE $2
         OR action ILIKE $2)
      ORDER BY timestamp DESC
      LIMIT $3`,
    [search, pattern, limit],
  );
  return result.rows;
}
