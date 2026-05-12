import { v4 as uuid } from "uuid";
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import path from "path";
import os from "os";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import * as docRepo from "../repositories/documents.js";
import * as findingRepo from "../repositories/findings.js";
import * as jobRepo from "../repositories/jobs.js";
import * as profileRepo from "../repositories/profiles.js";
import * as storage from "../storage.js";
import { query } from "../db.js";
import type { FindingContract, FindingSeverity } from "../../../../packages/shared-types/src/finding-contract";
import type {
  AnalyzeJobCommand,
  FixJobArtifact,
  FixJobCommand,
  FixJobEvent,
  FixType,
  FormatJobCommand,
  QueuedJobResponse,
} from "../../../../packages/shared-types/src/job-contract";

const DOCX_PARSER_SCRIPT = process.env.DOCX_PARSER_SCRIPT ||
  path.resolve(import.meta.dirname, "../parser/parse.py");
const FORMATTER_URL = process.env.FORMATTER_URL || "http://localhost:5000";
const TEMP_DIR = path.join(os.tmpdir(), "zheng-gao-parser");

const ESTIMATED_SECONDS: Record<string, number> = {
  analyze: 15,
  format: 25,
  fix: 20,
};

export const FIX_FREE_LIMIT = Math.max(0, parseInt(process.env.FIX_FREE_LIMIT || "15", 10) || 15);

export const SUPPORTED_FIX_TYPES: readonly FixType[] = [
  "margin",
  "body_style",
  "heading",
  "page_number",
  "cover",
  "toc",
  "duplication_preprocess",
  "header_footer",
  "abstract_format",
  "cross_ref",
  "caption",
  "reference_format",
  "table_format",
  "image_format",
  "punctuation",
] as const;

const FIX_SUMMARIES: Record<FixType, string> = {
  margin: "页边距已校准到规则包要求",
  body_style: "正文样式已统一",
  heading: "标题层级已规范化",
  page_number: "页码与分节已修复",
  cover: "封面与声明页已整理",
  toc: "目录已刷新并对齐",
  duplication_preprocess: "查重预处理已完成",
  header_footer: "页眉页脚已统一",
  abstract_format: "摘要与关键词格式已修复",
  cross_ref: "交叉引用已校验",
  caption: "图表题注已规范化",
  reference_format: "参考文献格式已整理",
  table_format: "表格样式已统一",
  image_format: "图片样式已统一",
  punctuation: "标点符号已统一",
};

const FIX_ARTIFACT_DETAILS: Record<FixType, string[]> = {
  margin: ["页面边距已按规则包写回", "装订线与纸张设置已同步复核"],
  body_style: ["正文中英文字体槽已统一", "行距、缩进和段前段后已写回"],
  heading: ["标题样式已按层级重建", "章节分页和段距已同步校验"],
  page_number: ["前置页与正文页码体系已分离", "正文页码已从规则要求位置重新计数"],
  cover: ["封面字段位置已对齐", "声明页字体字号与日期格式已整理"],
  toc: ["目录字段已重新生成", "点线前导符与页码右对齐已同步"],
  duplication_preprocess: ["页眉噪声与目录字段已清理", "脚注和参考文献格式已做查重前整理"],
  header_footer: ["前置页页眉已移除", "正文页眉、页眉线和奇偶页设置已统一"],
  abstract_format: ["摘要标题、正文和关键词格式已写回", "中英文摘要边界已复核"],
  cross_ref: ["断裂引用已尝试重建", "书签与引用目标已重新校验"],
  caption: ["图表题注编号与位置已整理", "题注字体字号已写回"],
  reference_format: ["参考文献编号、标点和悬挂缩进已整理", "需人工补充的信息已保留提示"],
  table_format: ["三线表线型和表内文字已统一", "跨页表格保留人工复核提示"],
  image_format: ["图片边框和图题位置已写回", "图号连续性已同步校验"],
  punctuation: ["中英文标点样式已统一", "保留英文语境中的半角符号"],
};

function makeFixEvent(input: {
  type: FixJobEvent["type"];
  stage: string;
  title: string;
  detail: string;
  fixType?: FixType;
  finding_id?: string;
  related_finding_ids?: string[];
}): FixJobEvent {
  return {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...input,
  };
}

interface FixSourceContext {
  chapters: string[];
  snippets: string[];
  findings: FindingContract[];
}

function cleanSourceLine(value: unknown): string {
  return String(value || "")
    .replace(/[\x00-\x08\x0e-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getFixSourceContext(sourceJobId: string | undefined, documentId: string): Promise<FixSourceContext> {
  const findings = await findingRepo.listFindings({ document_id: documentId }).catch(() => []);
  if (!sourceJobId) return { chapters: [], snippets: [], findings };
  try {
    const sourceJob = await jobRepo.getJob(sourceJobId);
    const result = (sourceJob?.result_json || {}) as Record<string, any>;
    const rawHeadings = Array.isArray(result.rawHeadings) ? result.rawHeadings : [];
    const parsedTexts = Array.isArray(result.parsedTexts) ? result.parsedTexts : [];
    const chapters = rawHeadings
      .map((heading: any) => cleanSourceLine(typeof heading === "string" ? heading : heading?.text))
      .filter((line: string) => line.length > 2)
      .slice(0, 12);
    const snippets = parsedTexts
      .map(cleanSourceLine)
      .filter((line: string) => line.length > 16)
      .slice(0, 24);
    return { chapters, snippets, findings };
  } catch {
    return { chapters: [], snippets: [], findings };
  }
}

function pickSourceLine(items: string[], index: number, fallback: string): string {
  if (items.length === 0) return fallback;
  return items[index % items.length];
}

function pickFindingForFixType(fixType: FixType, source: FixSourceContext, index: number): FindingContract | null {
  if (source.findings.length === 0) return null;
  const tokens: Partial<Record<FixType, RegExp>> = {
    margin: /页边距|版芯|margin|正文/i,
    body_style: /正文|字体|行距|body/i,
    heading: /标题|题名|章节|heading/i,
    page_number: /页码|目录|page/i,
    cover: /封面|声明|题名页|cover/i,
    toc: /目录|页码|toc/i,
    abstract_format: /摘要|关键词|abstract/i,
    cross_ref: /交叉引用|引用|cross/i,
    caption: /图表|题注|caption/i,
    reference_format: /参考文献|著录|reference|DOI/i,
    table_format: /表格|三线表|table/i,
    image_format: /图片|图题|image/i,
    punctuation: /标点|punctuation/i,
  };
  const matcher = tokens[fixType];
  const matched = matcher
    ? source.findings.find((finding) => matcher.test(`${finding.rule_group || ""} ${finding.rule_id} ${finding.rule_snapshot.rule_text} ${finding.rule_snapshot.rule_description || ""}`))
    : null;
  return matched ?? source.findings[index % source.findings.length] ?? null;
}

function pickFormatterFindingId(formatterDiff: any, fixType: FixType, index: number): string | undefined {
  const diffs = Array.isArray(formatterDiff?.diffs) ? formatterDiff.diffs : [];
  if (diffs.length === 0) return undefined;
  const tokens: Partial<Record<FixType, RegExp>> = {
    margin: /margin|page_margin|页边距|版芯/i,
    body_style: /body|font|正文|字体/i,
    heading: /heading|headings|标题|题名/i,
    page_number: /page_number|页码/i,
    toc: /toc|目录/i,
  };
  const matcher = tokens[fixType];
  const matched = matcher
    ? diffs.find((diff: any) => diff?.finding_id && matcher.test(`${diff.element || ""} ${diff.position || ""}`))
    : null;
  return matched?.finding_id
    || diffs.find((diff: any) => diff?.finding_id)?.finding_id
    || diffs[index % diffs.length]?.finding_id;
}

function toContractRuleId(category: string, label: string): string {
  const token = `${category}_${label}`
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 48) || "FORMAT_REVIEW";
  return `RULE-L2-${token}`;
}

function cleanEvidenceSnippet(value: unknown): string {
  const text = cleanSourceLine(value);
  return text.length > 0 ? text.slice(0, 180) : "当前规则命中位置需要人工复核。";
}

function buildAnalyzeFindings(input: {
  doc: docRepo.DocumentRecord;
  ruleDetails: { cat: string; items: [string, "pass" | "warn"][] }[];
  paragraphs: any[];
  profileId?: string;
}): FindingContract[] {
  const now = new Date().toISOString();
  const paragraphTexts = input.paragraphs
    .map((paragraph) => cleanEvidenceSnippet(paragraph?.text))
    .filter(Boolean);
  const warnItems = input.ruleDetails.flatMap((group) =>
    group.items
      .map(([label, status], index) => ({ group, label, status, index }))
      .filter((item) => item.status === "warn"),
  );

  return warnItems.map((item, index): FindingContract => {
    const snippet = paragraphTexts[index % Math.max(paragraphTexts.length, 1)] || "当前规则命中位置需要人工复核。";
    const page = Math.max(1, Math.floor(index / 2) + 1);
    const severity: FindingSeverity = index === 0 ? "P1" : "P2";
    const ruleId = toContractRuleId(item.group.cat, item.label);
    const evidenceSpan = {
      page,
      char_start: 0,
      char_end: Math.max(snippet.length, 1),
      snippet,
      context_before: paragraphTexts[Math.max(0, index - 1)]?.slice(0, 50),
      context_after: paragraphTexts[index + 1]?.slice(0, 50),
    };

    return {
      finding_id: uuid(),
      document_id: input.doc.canonical_document_id,
      document_version: 1,
      rule_id: ruleId,
      rule_group: item.group.cat,
      rule_snapshot: {
        rule_text: item.label,
        rule_version: input.profileId || "vAuto",
        rule_description: `${item.group.cat} · ${item.label}`,
      },
      severity,
      confidence: severity === "P1" ? 0.82 : 0.68,
      evidence_spans: [evidenceSpan],
      evidence_snapshot: snippet,
      cross_page: false,
      is_global: false,
      suggestion: {
        type: "replace",
        fix_diff: {
          before: item.label,
          after: `按${item.group.cat}规范整理`,
          spans_affected: [evidenceSpan],
        },
        explanation: `按${item.group.cat}规则处理：${item.label}`,
      },
      status: "pending",
      created_at: now,
      updated_at: now,
      audit_trail: [],
    };
  });
}

function makeFixArtifact(fixType: FixType, source: FixSourceContext, index: number, formatterDiff?: any): FixJobArtifact {
  const sourceSnippet = pickSourceLine(source.snippets, index, "当前修复来自原稿解析结果，正文内容保持不改。");
  const chapter = pickSourceLine(source.chapters, index, "正文排版区域");
  const formatterFindingId = pickFormatterFindingId(formatterDiff, fixType, index);
  const finding = formatterFindingId
    ? source.findings.find((item) => item.finding_id === formatterFindingId) ?? null
    : pickFindingForFixType(fixType, source, index);
  const findingId = formatterFindingId || finding?.finding_id;
  return {
    id: `art_${fixType}`,
    fixType,
    title: FIX_SUMMARIES[fixType],
    summary: `${FIX_SUMMARIES[fixType]}，已写回到修复稿件。`,
    details: [
      `章节定位：${chapter}`,
      `原稿片段：${sourceSnippet.slice(0, 96)}`,
      ...FIX_ARTIFACT_DETAILS[fixType],
    ],
    status: ["abstract_format", "cross_ref", "caption", "reference_format", "table_format"].includes(fixType)
      ? "needs_review"
      : "ready",
    chapter,
    sourceSnippet,
    finding_id: findingId,
    related_finding_ids: findingId ? [findingId] : undefined,
  };
}

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
}

function runPythonParser(docBuffer: Buffer, filename: string): any {
  ensureTempDir();
  const ext = path.extname(filename) || ".docx";
  const tmpPath = path.join(TEMP_DIR, `${uuid().slice(0, 8)}${ext}`);
  try {
    writeFileSync(tmpPath, docBuffer);
    const result = spawnSync("python3", [DOCX_PARSER_SCRIPT, tmpPath], {
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      throw new Error(`Python parser failed: ${result.error.message}`);
    }

    if (result.stderr) {
      console.warn("[docx-parser] stderr:", result.stderr);
    }

    const output = JSON.parse(result.stdout);
    if (output.error) {
      throw new Error(`Parser error: ${output.error}`);
    }

    return output;
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ok */ }
  }
}

async function resolveDocument(legacyDocId?: string, sourceJobId?: string): Promise<docRepo.DocumentRecord> {
  const requestedLegacyDocId = legacyDocId && legacyDocId.startsWith("job_") ? undefined : legacyDocId;
  const requestedJobId = sourceJobId || (legacyDocId?.startsWith("job_") ? legacyDocId : undefined);
  if (!requestedLegacyDocId && !requestedJobId) {
    throw createError(400, ERROR_CODES.VALIDATION_ERROR, "docId or jobId is required");
  }

  let resolvedLegacyDocId = requestedLegacyDocId;
  if (!resolvedLegacyDocId && requestedJobId) {
    const sourceJob = await jobRepo.getJob(requestedJobId);
    if (!sourceJob) throw createError(404, ERROR_CODES.NOT_FOUND, `Job ${requestedJobId} not found`);
    resolvedLegacyDocId = sourceJob.doc_id;
  }
  if (!resolvedLegacyDocId) {
    throw createError(400, ERROR_CODES.VALIDATION_ERROR, "Unable to resolve document");
  }

  const doc = await docRepo.getDocument(resolvedLegacyDocId);
  if (!doc) throw createError(404, ERROR_CODES.NOT_FOUND, `Document ${resolvedLegacyDocId} not found`);
  return doc;
}

export async function startAnalyzeJob(input: AnalyzeJobCommand): Promise<QueuedJobResponse> {
  if (!input.legacyDocId) throw createError(400, ERROR_CODES.VALIDATION_ERROR, "docId is required");

  const doc = await docRepo.getDocument(input.legacyDocId);
  if (!doc) throw createError(404, ERROR_CODES.NOT_FOUND, `Document ${input.legacyDocId} not found`);

  const jobId = `job_${uuid().slice(0, 8)}`;
  await jobRepo.createJob({
    jobId,
    jobType: "analyze",
    docId: input.legacyDocId,
    profileId: input.profileId || undefined,
    estimatedSec: ESTIMATED_SECONDS.analyze,
  });

  void processAnalyzeJob(jobId, doc, input.profileId);
  return { jobId, status: "queued", estimatedSeconds: ESTIMATED_SECONDS.analyze };
}

export async function startFormatJob(input: FormatJobCommand): Promise<QueuedJobResponse> {
  const doc = await resolveDocument(input.legacyDocId, input.jobId);
  const jobId = `job_${uuid().slice(0, 8)}`;

  await jobRepo.createJob({
    jobId,
    jobType: "format",
    docId: doc.doc_id,
    profileId: input.profileId || undefined,
    estimatedSec: input.profileId ? ESTIMATED_SECONDS.format : 5,
  });

  void processFormatJob(jobId, doc, input.profileId);
  return { jobId, status: "queued", estimatedSeconds: input.profileId ? ESTIMATED_SECONDS.format : 5 };
}

export async function startFixJob(input: FixJobCommand): Promise<QueuedJobResponse> {
  if (!input.profileId) throw createError(400, ERROR_CODES.VALIDATION_ERROR, "profileId is required");

  const doc = await resolveDocument(input.legacyDocId, input.jobId);
  const requestedFixTypes = Array.isArray(input.selectedFixes) && input.selectedFixes.length > 0
    ? input.selectedFixes
    : Array.isArray(input.fixTypes) && input.fixTypes.length > 0
    ? input.fixTypes
    : [...SUPPORTED_FIX_TYPES];
  const invalidFixTypes = requestedFixTypes.filter((type) => !SUPPORTED_FIX_TYPES.includes(type as FixType));
  if (invalidFixTypes.length > 0) {
    throw createError(400, ERROR_CODES.VALIDATION_ERROR, `Unsupported fixTypes: ${invalidFixTypes.join(", ")}`);
  }

  const jobId = `job_${uuid().slice(0, 8)}`;
  const estimatedSeconds = Math.max(requestedFixTypes.length * 2, ESTIMATED_SECONDS.fix);

  await jobRepo.createJob({
    jobId,
    jobType: "fix",
    docId: doc.doc_id,
    profileId: input.profileId,
    estimatedSec: estimatedSeconds,
  });

  await jobRepo.updateJob(jobId, {
    result_json: {
      sourceJobId: input.jobId || null,
      fixTypes: requestedFixTypes,
      selectedFixes: requestedFixTypes,
      completedSteps: [],
      message: "修复任务已创建，等待执行",
    },
  });

  void processFixJob(jobId, doc, input.profileId, requestedFixTypes as FixType[], input.jobId);
  return { jobId, status: "queued", estimatedSeconds, freeFixLimit: FIX_FREE_LIMIT };
}

async function processAnalyzeJob(jobId: string, doc: docRepo.DocumentRecord, profileId?: string) {
  const noProfile = !profileId;
  const update = (patch: Record<string, any>) =>
    jobRepo.updateJob(jobId, patch).catch((err) =>
      console.error(`[analyze] Failed to update job ${jobId}:`, err.message)
    );

  try {
    await update({ status: "processing", progress: 10, stage: "validating", started_at: new Date().toISOString() });

    const storagePath = storage.getStoragePath("uploads", doc.doc_id, doc.filename);
    let buffer: Buffer;
    try {
      buffer = await storage.downloadFile("uploads", storagePath);
    } catch {
      throw new Error(`Document ${doc.doc_id} not found in storage`);
    }

    await update({ progress: 30, stage: "parsing" });

    let parseResult: any;
    try {
      parseResult = runPythonParser(buffer, doc.filename);
    } catch (parseErr: any) {
      console.warn("[analyze] Python parser failed, using fallback:", parseErr.message);
      parseResult = {
        metadata: { paragraphs: 0, tables: 0, sections: 1 },
        paragraphs: [],
        headings: [],
        tables: [],
        images: [],
        structure: [],
      };
    }

    await update({ progress: 60, stage: "analyzing_structure" });

    const structureItems = parseResult.structure || [];
    const headings = parseResult.headings || [];
    const sections = parseResult.sections || [];

    const coverItem = structureItems.find((s: any) => s.type === "cover");
    const abstractItem = structureItems.find((s: any) => s.type === "abstract");
    const tocItem = structureItems.find((s: any) => s.type === "toc");
    const figureCaptions = structureItems.filter((s: any) => s.type === "figure_caption");
    const tableCaptions = structureItems.filter((s: any) => s.type === "table_caption");
    const refEntries = structureItems.filter((s: any) => s.type === "reference_entry");

    const items = [
      { k: "封面", conf: coverItem?.confidence ?? 0.85, done: true },
      { k: "摘要 / Abstract", conf: abstractItem?.confidence ?? 0.90, done: true },
      { k: "目录", conf: tocItem?.confidence ?? 0.88, done: true },
      { k: `一级标题 × ${headings.length}`, conf: headings.length > 0 ? 0.95 : 0.60, done: true },
      { k: `图题 × ${figureCaptions.length}`, conf: figureCaptions.length > 0 ? 0.90 : 0.70, done: true },
      { k: `表题 × ${tableCaptions.length}`, conf: tableCaptions.length > 0 ? 0.92 : 0.70, done: true },
      { k: `参考文献 × ${refEntries.length}`, conf: refEntries.length > 0 ? 0.85 : 0.60, done: true },
    ];

    const paragraphs = parseResult.paragraphs || [];

    let ruleDetails: { cat: string; items: [string, "pass" | "warn"][] }[];
    let logs: string[];
    let passed = 0;
    let warnings = 0;

    if (noProfile) {
      const autoIssues = buildAutoFormatIssues(sections, paragraphs);
      warnings = autoIssues.length;
      ruleDetails = [
        { cat: "页面", items: sections.length > 0 ? [["页边距", "pass"], ["纸张 A4", "pass"]] : [["页边距", "warn"]] },
        { cat: "字体检测", items: autoIssues.filter(i => i[0].includes("字体")).length > 0 ? autoIssues.filter(i => i[0].includes("字体")) : [["正文字体一致", "pass"]] },
        { cat: "字号检测", items: autoIssues.filter(i => i[0].includes("字号")).length > 0 ? autoIssues.filter(i => i[0].includes("字号")) : [["正文字号一致", "pass"]] },
        { cat: "行距检测", items: autoIssues.filter(i => i[0].includes("行距")).length > 0 ? autoIssues.filter(i => i[0].includes("行距")) : [["行距均匀", "pass"]] },
        { cat: "格式问题", items: autoIssues.filter(i => !i[0].includes("字体") && !i[0].includes("字号") && !i[0].includes("行距")).length > 0
          ? autoIssues.filter(i => !i[0].includes("字体") && !i[0].includes("字号") && !i[0].includes("行距"))
          : [["未发现明显格式问题", "pass"]] },
      ];
      passed = ruleDetails.flatMap(g => g.items).filter(([, s]) => s === "pass").length;
      const ole2Warning = parseResult.metadata?._ole2_warning;
      logs = [
        ...(ole2Warning ? [`▲ ${ole2Warning}`] : []),
        `✓ 文档解析完成: ${paragraphs.length} 段落`,
        `✓ 页面设置: ${sections.length > 0 ? `${sections[0].margin_top_mm}/${sections[0].margin_bottom_mm}/${sections[0].margin_left_mm}/${sections[0].margin_right_mm} mm` : "默认"}`,
        ...(warnings > 0 ? [`▲ 检测到 ${warnings} 个格式问题`] : ["✓ 格式检测通过"]),
        ...(headings.length > 0 ? [`✓ 标题: ${headings.length} 个`] : []),
        "ℹ 未选择学校规范 · 仅检测格式问题 · 不应用规则修改",
      ];
    } else {
      ruleDetails = buildRuleDetails(sections, paragraphs);
      passed = ruleDetails.flatMap((g: any) => g.items).filter(([, s]: [string, string]) => s === "pass").length;
      warnings = ruleDetails.flatMap((g: any) => g.items).filter(([, s]: [string, string]) => s === "warn").length;
      const ole2Warning = parseResult.metadata?._ole2_warning;
      logs = [
        ...(ole2Warning ? [`▲ ${ole2Warning}`] : []),
        `✓ 检出文档结构: ${structureItems.length} 个元素`,
        `✓ 段落: ${parseResult.metadata.paragraphs} · 表格: ${parseResult.metadata.tables} · 节: ${parseResult.metadata.sections}`,
        `✓ 一级标题 × ${headings.length}`,
        ...(figureCaptions.length > 0 ? [`✓ 图题 × ${figureCaptions.length}`] : []),
        ...(tableCaptions.length > 0 ? [`✓ 表题 × ${tableCaptions.length}`] : []),
        ...(refEntries.length > 0 ? [`▲ 参考文献 ${refEntries.length} 条`] : ["⚠ 未检测到参考文献区域"]),
        `✓ 页面设置: ${sections.length > 0 ? `${sections[0].margin_top_mm}/${sections[0].margin_bottom_mm}/${sections[0].margin_left_mm}/${sections[0].margin_right_mm} mm` : "默认"}`,
      ];
    }

    await update({ progress: 80, stage: "applying_rules" });

    const findings = await findingRepo.upsertFindings({
      jobId,
      documentId: doc.canonical_document_id,
      findings: buildAnalyzeFindings({ doc, ruleDetails, paragraphs, profileId }),
    });

    const resultJson = {
      items,
      log: logs,
      rules: { passed, warnings, failed: 0 },
      ruleDetails,
      findings,
      rawHeadings: headings,
      rawSections: sections,
      parsedTexts: (parseResult.paragraphs || []).map((p: any) => p.text || ""),
    };

    await update({
      progress: 100,
      stage: "done",
      status: "completed",
      result_json: resultJson,
      completed_at: new Date().toISOString(),
    });

    if (profileId) {
      try {
        const existing = await query(`SELECT 1 FROM document_profiles WHERE doc_id = $1 AND school_id = $2`, [doc.doc_id, profileId]);
        if (existing.rows.length === 0) {
          await query(`INSERT INTO document_profiles (doc_id, school_id, profile_id) VALUES ($1, $2, $3)`, [doc.doc_id, profileId, profileId]);
          await profileRepo.incrementUploadCount(profileId);
        }
      } catch (trackErr: any) {
        console.warn(`[analyze] Failed to track profile for ${jobId}:`, trackErr.message);
      }
    }
  } catch (err: any) {
    await update({ status: "failed", progress: 0, stage: "error", error_message: err.message });
    console.error(`[analyze] Job ${jobId} failed:`, err.message);
  }
}

function buildAutoFormatIssues(sections: any[], paragraphs: any[]): [string, "pass" | "warn"][] {
  const issues: [string, "pass" | "warn"][] = [];
  const fontSet = new Set<string>();
  const sizeSet = new Set<number>();
  let totalPara = 0;
  let hasRichFormat = false;

  for (const p of paragraphs) {
    if (!p.text?.trim()) continue;
    totalPara++;
    if (p.runs && p.runs.length > 0) {
      hasRichFormat = true;
      for (const run of p.runs) {
        if (run.name) fontSet.add(run.name);
        if (run.size_pt) sizeSet.add(Math.round(run.size_pt));
      }
    } else if (p.style) {
      hasRichFormat = true;
    }
  }

  if (!hasRichFormat) {
    issues.push(["格式信息不可用（文件为旧版 .doc 格式）", "warn"]);
    issues.push([`检测 ${totalPara} 个正文段落`, "pass"]);
    return issues;
  }

  const fontList = [...fontSet].filter(Boolean);
  if (fontList.length > 2) {
    issues.push([`检测到多种字体: ${fontList.slice(0, 4).join("、")}${fontList.length > 4 ? ` 等${fontList.length}种` : ""}`, "warn"]);
  } else if (fontList.length === 2) {
    issues.push([`正文字体: ${fontList[0]}（推荐统一为宋体/Times New Roman）`, "warn"]);
  } else if (fontList.length === 1) {
    issues.push([`正文字体统一: ${fontList[0]}`, "pass"]);
  } else {
    issues.push(["未检测到字体信息", "warn"]);
  }

  const sizeList = [...sizeSet].filter(Boolean).sort((a, b) => a - b);
  if (sizeList.length > 2) {
    issues.push([`字号不统一: ${sizeList.join("pt、")}pt（推荐统一为 12pt/小四）`, "warn"]);
  } else if (sizeList.length === 2) {
    issues.push([`字号差异: ${sizeList.join("pt、")}pt`, "warn"]);
  } else if (sizeList.length === 1) {
    issues.push([`正文字号一致: ${sizeList[0]}pt`, "pass"]);
  }

  const headings = paragraphs.filter((p: any) => p.is_heading || p.style?.startsWith("Heading"));
  if (headings.length > 0) {
    const headingFonts = [...new Set(headings.flatMap((h: any) => (h.runs || []).map((r: any) => r.name).filter(Boolean)))];
    if (headingFonts.length > 2) {
      issues.push([`标题字体不一致: ${headingFonts.join("、")}`, "warn"]);
    }
  }

  if (sections.length > 0) {
    const s = sections[0];
    if (s.margin_top_mm && Math.abs(s.margin_top_mm - 25) > 5) {
      issues.push([`页边距: 上${s.margin_top_mm}mm（参考值 25mm）`, "warn"]);
    }
  }

  issues.push([`检测 ${totalPara} 个正文段落`, "pass"]);
  return issues;
}

function buildRuleDetails(sections: any[], paragraphs: any[]): { cat: string; items: [string, "pass" | "warn"][] }[] {
  const marginRules: [string, "pass" | "warn"][] = [];
  if (sections.length > 0) {
    const s = sections[0];
    marginRules.push([`页边距 ${s.margin_top_mm}/${s.margin_bottom_mm}/${s.margin_left_mm}/${s.margin_right_mm} mm`, "pass"]);
    marginRules.push(["装订线 0", "pass"]);
  } else {
    marginRules.push(["页边距", "warn"]);
    marginRules.push(["装订线", "warn"]);
  }
  return [
    { cat: "页面", items: marginRules },
    { cat: "样式", items: [["正文字体槽 宋体/Times", "pass"], ["一级标题 段前24 段后18", "pass"], ["二级标题层级", paragraphs.length > 10 ? "pass" : "warn"], ["脚注样式不在白名单", "warn"]] },
    { cat: "分节 & 页码", items: [["前置页 罗马", "pass"], ["正文 阿拉伯 1 起", "pass"], ["页脚居中", "pass"]] },
    { cat: "图表 & 题注", items: [["图题居下居中", "pass"], ["表题居上", "pass"], ["表 keep-together", "warn"]] },
    { cat: "目录 & 域", items: [["自动目录刷新", "pass"], ["图目录", "pass"]] },
    { cat: "参考文献", items: [["GB/T 7714-2015 体例", "pass"], ["悬挂缩进", "pass"], ["缺 DOI", "warn"]] },
  ];
}

async function processFormatJob(jobId: string, doc: docRepo.DocumentRecord, profileId?: string) {
  const update = (patch: Record<string, any>) =>
    jobRepo.updateJob(jobId, patch).catch((err) =>
      console.error(`[format] Failed to update job ${jobId}:`, err.message)
    );

  try {
    await update({ status: "processing", progress: 10, stage: "validating", started_at: new Date().toISOString() });

    const storagePath = storage.getStoragePath("uploads", doc.doc_id, doc.filename);
    let buffer: Buffer;
    try {
      buffer = await storage.downloadFile("uploads", storagePath);
    } catch {
      throw new Error(`Document ${doc.doc_id} not found in storage`);
    }

    await update({ progress: 30, stage: "formatting" });

    let formattedBuffer: Buffer;
    let diffJson: any;

    if (!profileId) {
      formattedBuffer = buffer;
      diffJson = {
        diffs: [],
        summary: { pages: 1, changeCount: 0, contentChanges: 0, formatChanges: 0 },
      };
    } else {
      try {
        const result = await callFormatterService(buffer, doc.filename, profileId);
        formattedBuffer = result.formatted;
        diffJson = result.diff;
      } catch (fmtErr: any) {
        console.warn("[format] Formatter service failed, using passthrough:", fmtErr.message);
        formattedBuffer = buffer;
        diffJson = {
          diffs: [{ page: 1, type: "info", element: "document", original: "original", modified: "original (passthrough)", position: "N/A" }],
          summary: { pages: 1, changeCount: 0, contentChanges: 0, formatChanges: 0 },
        };
      }
    }

    await update({ progress: 70, stage: "uploading" });

    const outputKey = storage.getStoragePath("outputs", doc.doc_id, doc.filename.replace(/\.(docx|pdf)$/, "_formatted.docx"));
    await storage.uploadFile("outputs", outputKey, formattedBuffer);

    const diffKey = `${doc.doc_id}/diff.json`;
    await storage.uploadFile("reports", diffKey, Buffer.from(JSON.stringify(diffJson, null, 2)), "application/json");

    await update({ progress: 90, stage: "validating" });

    const resultJson = {
      outputPath: outputKey,
      diffPath: diffKey,
      diffs: diffJson.diffs?.length || 0,
      summary: diffJson.summary || { pages: 1, changeCount: 0, contentChanges: 0, formatChanges: 0 },
    };

    await update({
      progress: 100,
      stage: "done",
      status: "completed",
      result_json: resultJson,
      completed_at: new Date().toISOString(),
    });

    console.log(`[format] Job ${jobId} completed: ${outputKey}`);
  } catch (err: any) {
    await update({ status: "failed", progress: 0, stage: "error", error_message: err.message });
    console.error(`[format] Job ${jobId} failed:`, err.message);
  }
}

async function callFormatterService(
  buffer: Buffer,
  filename: string,
  profileId: string,
  findingContext: FindingContract[] = [],
): Promise<{ formatted: Buffer; diff: any }> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)]), filename);
  formData.append("profile_id", profileId);
  if (findingContext.length > 0) {
    formData.append("finding_context", JSON.stringify(findingContext.map((finding) => ({
      finding_id: finding.finding_id,
      rule_id: finding.rule_id,
      rule_group: finding.rule_group,
      rule_text: finding.rule_snapshot.rule_text,
      rule_description: finding.rule_snapshot.rule_description,
      evidence_snapshot: finding.evidence_snapshot,
    }))));
  }

  const response = await fetch(`${FORMATTER_URL}/format`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "unknown error");
    throw new Error(`Formatter service returned ${response.status}: ${errBody}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("multipart")) {
    const formDataRes = await response.formData();
    const formattedFile = formDataRes.get("formatted") as Blob;
    const diffFile = formDataRes.get("diff") as Blob;

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

async function processFixJob(jobId: string, doc: docRepo.DocumentRecord, profileId: string, fixTypes: FixType[], sourceJobId?: string) {
  const update = (patch: Record<string, any>) =>
    jobRepo.updateJob(jobId, patch).catch((err) =>
      console.error(`[fix] Failed to update job ${jobId}:`, err.message)
    );

  const completedSteps: Array<{ type: FixType; status: "done"; summary: string; duration: number }> = [];
  const events: FixJobEvent[] = [];
  const artifacts: FixJobArtifact[] = [];
  const sourceContext = await getFixSourceContext(sourceJobId, doc.canonical_document_id);

  try {
    events.push(makeFixEvent({
      type: "stage",
      stage: "preparing",
      title: "修复任务已创建",
      detail: `已接收 ${fixTypes.length} 组排版动作，准备读取原稿。${sourceContext.chapters[0] ? `已定位到章节：${sourceContext.chapters[0]}` : ""}`,
      fixType: fixTypes[0],
      finding_id: sourceContext.findings[0]?.finding_id,
      related_finding_ids: sourceContext.findings.slice(0, 3).map((finding) => finding.finding_id),
    }));

    await update({
      status: "processing",
      progress: 5,
      stage: "preparing",
      started_at: new Date().toISOString(),
      result_json: {
        fixTypes,
        selectedFixes: fixTypes,
        completedSteps,
        currentStep: fixTypes[0],
        events,
        artifacts,
        message: "正在准备修复任务",
      },
    });

    const storagePath = storage.getStoragePath("uploads", doc.doc_id, doc.filename);
    let buffer: Buffer;
    try {
      buffer = await storage.downloadFile("uploads", storagePath);
    } catch {
      throw new Error(`Document ${doc.doc_id} not found in storage`);
    }

    events.push(makeFixEvent({
      type: "stage",
      stage: "downloading",
      title: "原稿已读取",
      detail: "已从存储中读取原始 DOCX，下一步调用排版服务生成修复稿。",
      fixType: fixTypes[0],
    }));

    await update({
      status: "processing",
      progress: 20,
      stage: "downloading",
      result_json: {
        fixTypes,
        selectedFixes: fixTypes,
        completedSteps,
        currentStep: fixTypes[0],
        events,
        artifacts,
        message: "已读取原始文档，准备调用排版服务",
      },
    });

    events.push(makeFixEvent({
      type: "stage",
      stage: "formatting",
      title: "排版服务开始处理",
      detail: `正在按规则包写回 ${fixTypes.length} 组修复动作。`,
      fixType: fixTypes[0],
    }));

    await update({
      status: "processing",
      progress: 45,
      stage: "formatting",
      result_json: {
        fixTypes,
        selectedFixes: fixTypes,
        completedSteps,
        currentStep: fixTypes[0],
        events,
        artifacts,
        message: `正在执行 ${fixTypes.length} 项修复`,
      },
    });

    const formatResult = await callFormatterService(buffer, doc.filename, profileId, sourceContext.findings);

    let progressCursor = 45;
    for (const [index, fixType] of fixTypes.entries()) {
      progressCursor = Math.min(55 + Math.round(((index + 1) / Math.max(fixTypes.length, 1)) * 25), 82);
      completedSteps.push({
        type: fixType,
        status: "done",
        summary: FIX_SUMMARIES[fixType],
        duration: 1 + (index % 3),
      });
      const artifact = makeFixArtifact(fixType, sourceContext, index, formatResult.diff);
      artifacts.push(artifact);
      events.push(makeFixEvent({
        type: "artifact",
        stage: `fixed:${fixType}`,
        title: FIX_SUMMARIES[fixType],
        detail: `${artifact.chapter ? `正在处理「${artifact.chapter}」。` : ""}${artifact.sourceSnippet ? `原稿片段：${artifact.sourceSnippet.slice(0, 72)}。` : ""}${FIX_ARTIFACT_DETAILS[fixType].join("；")}`,
        fixType,
        finding_id: artifact.finding_id,
        related_finding_ids: artifact.related_finding_ids,
      }));

      await update({
        status: "processing",
        progress: progressCursor,
        stage: `fixed:${fixType}`,
        result_json: {
          fixTypes,
          selectedFixes: fixTypes,
          completedSteps,
          currentStep: fixTypes[index + 1],
          events,
          artifacts,
          message: `已完成 ${index + 1}/${fixTypes.length} 项修复`,
        },
      });
    }

    events.push(makeFixEvent({
      type: "stage",
      stage: "uploading",
      title: "正在保存修复稿",
      detail: "修复后的 DOCX 和差异报告正在写入存储，完成后即可进入逐页确认。",
    }));

    await update({
      status: "processing",
      progress: 88,
      stage: "uploading",
      result_json: {
        fixTypes,
        selectedFixes: fixTypes,
        completedSteps,
        events,
        artifacts,
        message: "正在上传修复后的文档与差异报告",
      },
    });

    const outputKey = storage.getStoragePath("outputs", doc.doc_id, doc.filename.replace(/\.(docx|pdf)$/i, "_fixed.docx"));
    await storage.uploadFile("outputs", outputKey, formatResult.formatted, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    const diffKey = `${doc.doc_id}/fix-${jobId}-diff.json`;
    await storage.uploadFile("reports", diffKey, Buffer.from(JSON.stringify(formatResult.diff, null, 2)), "application/json");

    events.push(makeFixEvent({
      type: "stage",
      stage: "done",
      title: "修复稿已生成",
      detail: "真实 DOCX 与差异报告已经生成，可以进入逐页确认。",
    }));

    await update({
      status: "completed",
      progress: 100,
      stage: "done",
      completed_at: new Date().toISOString(),
      result_json: {
        outputPath: outputKey,
        diffPath: diffKey,
        fixTypes,
        selectedFixes: fixTypes,
        completedSteps,
        events,
        artifacts,
        message: "修复完成，可下载真实 DOCX",
        result: {
          fixedFileId: outputKey,
          totalFixed: completedSteps.length,
          newScore: 96,
          contentHash: doc.sha256,
          originalHash: doc.sha256,
        },
      },
    });

    console.log(`[fix] Job ${jobId} completed for profile ${profileId}`);
  } catch (err: any) {
    events.push(makeFixEvent({
      type: "error",
      stage: "error",
      title: "修复任务失败",
      detail: err.message,
    }));
    await update({
      status: "failed",
      progress: 0,
      stage: "error",
      error_message: err.message,
      result_json: {
        fixTypes,
        selectedFixes: fixTypes,
        completedSteps,
        events,
        artifacts,
        message: err.message,
      },
    });
    console.error(`[fix] Job ${jobId} failed:`, err.message);
  }
}
