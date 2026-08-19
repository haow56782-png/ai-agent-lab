import type { Request } from "express";
import { Router } from "express";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import { parseShareReportCommand } from "../dto/document-requests.js";
import * as shareRepo from "../repositories/share.js";
import * as jobRepo from "../repositories/jobs.js";
import * as docRepo from "../repositories/documents.js";
import * as profileRepo from "../repositories/profiles.js";

export const shareRoutes = Router();
export const sharePageRoutes = Router();

type Severity = "high" | "medium" | "low";

interface SharePayload {
  score: number;
  totalIssues: number;
  fixableIssues: number;
  topIssues: { title: string; severity: Severity }[];
  schoolName: string;
  collegeName: string;
  totalUsers: number;
  totalSchools: number;
  shareTitle: string;
  shareDesc: string;
  shareUrl: string;
  ogImageUrl: string;
  posterUrl: string;
  version?: string;
  createdAt: string;
}

function buildBaseUrl(req: Request): string {
  const protocol = req.protocol || "http";
  return `${protocol}://${req.get("host") || "localhost:4000"}`;
}

function prettySchoolName(schoolId?: string | null): string {
  if (!schoolId) return "";
  return schoolId
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeSeverity(status: string): Severity {
  if (status === "fail") return "high";
  if (status === "warn") return "medium";
  return "low";
}

function extractTopIssues(result: Record<string, any> | null | undefined): { title: string; severity: Severity }[] {
  const ruleDetails = Array.isArray(result?.ruleDetails) ? result.ruleDetails : [];
  const issues = ruleDetails.flatMap((group: any) =>
    Array.isArray(group?.items)
      ? group.items.map((item: any) => {
          const title = Array.isArray(item) ? item[0] : item?.label;
          const status = Array.isArray(item) ? item[1] : item?.status;
          return title && status && status !== "pass"
            ? { title: String(title), severity: normalizeSeverity(String(status)) }
            : null;
        }).filter(Boolean)
      : []
  ) as { title: string; severity: Severity }[];

  if (issues.length > 0) return issues.slice(0, 5);

  const completedSteps = Array.isArray(result?.completedSteps) ? result.completedSteps : [];
  if (completedSteps.length > 0) {
    return completedSteps.slice(0, 5).map((step: any) => ({
      title: step?.summary || step?.type || "格式问题待修复",
      severity: "medium",
    }));
  }

  return [
    { title: "正文行距不符合规范", severity: "high" },
    { title: "英文字体不统一", severity: "medium" },
    { title: "标题层级需检查", severity: "medium" },
    { title: "页码格式待确认", severity: "low" },
  ];
}

async function resolveShareContext(legacyDocId: string, checkResultLegacyDocId: string) {
  const seedIds = Array.from(new Set([checkResultLegacyDocId, legacyDocId].filter(Boolean)));

  let sourceJob: jobRepo.JobRecord | null = null;
  for (const id of seedIds) {
    sourceJob = await jobRepo.getJob(id);
    if (sourceJob) break;
  }

  let document: docRepo.DocumentRecord | null = null;

  if (!sourceJob) {
    for (const id of seedIds) {
      document = await docRepo.getDocument(id);
      if (document) {
        const jobs = await jobRepo.listJobsByDoc(document.doc_id);
        sourceJob = jobs.find((job) => job.status === "completed" && job.job_type === "analyze")
          || jobs.find((job) => job.status === "completed")
          || null;
        break;
      }
    }
  }

  if (sourceJob?.doc_id) {
    document = await docRepo.getDocument(sourceJob.doc_id);
    const jobs = await jobRepo.listJobsByDoc(sourceJob.doc_id);
    const analyzeJob = jobs.find((job) => job.status === "completed" && job.job_type === "analyze");
    if (analyzeJob) {
      sourceJob = analyzeJob;
    }
  }

  const profile = sourceJob?.profile_id ? await profileRepo.getProfile(sourceJob.profile_id) : null;

  return { sourceJob, document, profile };
}

async function buildSharePayload(req: Request, legacyDocId: string, checkResultLegacyDocId: string, shareId: string): Promise<{
  payload: SharePayload;
  sourceJobId: string | null;
  docId: string | null;
  profileId: string | null;
}> {
  const baseUrl = buildBaseUrl(req);
  const { sourceJob, document, profile } = await resolveShareContext(legacyDocId, checkResultLegacyDocId);
  const stats = await shareRepo.countShareStats();
  const result = (sourceJob?.result_json || {}) as Record<string, any>;

  const passed = Number(result?.rules?.passed || 0);
  const warnings = Number(result?.rules?.warnings || 0);
  const failed = Number(result?.rules?.failed || 0);
  const totalIssues = warnings + failed || Number(result?.result?.totalFixed || 0) || 4;
  const fixableIssues = warnings + failed || totalIssues;
  const totalChecks = passed + warnings + failed;
  const score = totalChecks > 0
    ? Math.max(0, Math.min(100, Math.round((passed / totalChecks) * 100)))
    : Number(result?.result?.newScore || 85);
  const topIssues = extractTopIssues(result);
  const schoolName = profile?.school_id ? prettySchoolName(profile.school_id) : "论文格式体检";
  const collegeName = profile?.faculty || profile?.major || "";
  const shareUrl = `${baseUrl}/share/report/${shareId}`;
  const ogImageUrl = `${baseUrl}/share/assets/og/${shareId}.svg`;
  const posterUrl = `${baseUrl}/share/assets/poster/${shareId}.svg`;
  const shareTitle = "我的论文格式体检报告";
  const shareDesc = `得分 ${score}/100 · 发现 ${totalIssues} 个格式问题`;

  const payload: SharePayload = {
    score,
    totalIssues,
    fixableIssues,
    topIssues,
    schoolName,
    collegeName,
    totalUsers: stats.totalUsers,
    totalSchools: stats.totalSchools,
    shareTitle,
    shareDesc,
    shareUrl,
    ogImageUrl,
    posterUrl,
    version: profile?.version,
    createdAt: new Date().toISOString(),
  };

  return {
    payload,
    sourceJobId: sourceJob?.job_id || null,
    docId: sourceJob?.doc_id || document?.doc_id || null,
    profileId: sourceJob?.profile_id || profile?.school_id || null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSharePage(shareId: string, payload: SharePayload): string {
  const issueList = payload.topIssues
    .slice(0, 5)
    .map((issue) => `<li><span class="sev ${issue.severity}">${issue.severity === "high" ? "✗" : "•"}</span>${escapeHtml(issue.title)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(payload.shareTitle)}</title>
  <meta name="description" content="${escapeHtml(payload.shareDesc)}" />
  <meta property="og:title" content="${escapeHtml(payload.shareTitle)}" />
  <meta property="og:description" content="${escapeHtml(payload.shareDesc)}" />
  <meta property="og:image" content="${escapeHtml(payload.ogImageUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(payload.shareUrl)}" />
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f4ef; color: #1f2937; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
    .card { background: #fff; border: 1px solid #e5dfd2; border-radius: 18px; box-shadow: 0 10px 24px rgba(0,0,0,.06); overflow: hidden; }
    .hero { padding: 26px 24px 18px; background: linear-gradient(180deg, #fcfbf8 0%, #fff 100%); }
    .brand { font-size: 12px; letter-spacing: .16em; color: #8a7f6f; text-transform: uppercase; }
    .score { width: 112px; height: 112px; border-radius: 56px; margin: 18px auto 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #eaf7ee; border: 4px solid #49a266; color: #2f8551; }
    .score strong { font-size: 42px; line-height: 1; }
    .score span { font-size: 12px; opacity: .75; }
    h1 { margin: 0 0 8px; text-align: center; font-size: 28px; }
    .meta, .proof { text-align: center; color: #6b7280; font-size: 14px; }
    .proof { margin-top: 10px; }
    .issues { padding: 20px 24px 0; }
    .issues h2 { margin: 0 0 10px; font-size: 15px; letter-spacing: .06em; color: #8a7f6f; }
    .issues ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .issues li { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; }
    .sev { width: 18px; display: inline-block; }
    .sev.high { color: #c2410c; }
    .sev.medium { color: #b45309; }
    .sev.low { color: #4b5563; }
    .cta { padding: 24px; text-align: center; }
    .cta a { display: inline-block; padding: 14px 26px; border-radius: 999px; background: #111827; color: #fff; text-decoration: none; font-weight: 600; }
    .footer { padding: 0 24px 24px; color: #8a7f6f; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hero">
        <div class="brand">remei · 论文格式体检</div>
        <div class="score"><strong>${payload.score}</strong><span>/ 100</span></div>
        <h1>发现 ${payload.totalIssues} 个格式问题</h1>
        <div class="meta">其中 ${payload.fixableIssues} 个可一键修复</div>
        <div class="proof">${escapeHtml(payload.schoolName)}${payload.collegeName ? ` · ${escapeHtml(payload.collegeName)}` : ""}</div>
        <div class="proof">已有 ${payload.totalUsers} 位同学使用 · 支持 ${payload.totalSchools} 所高校</div>
      </div>
      <div class="issues">
        <h2>主要问题</h2>
        <ul>${issueList}</ul>
      </div>
      <div class="cta">
        <a href="/">免费检测我的论文</a>
      </div>
      <div class="footer">分享 ID：${escapeHtml(shareId)} · 不展示姓名、学号和论文标题</div>
    </div>
  </div>
</body>
</html>`;
}

function renderOgSvg(shareId: string, payload: SharePayload, poster = false): string {
  const width = poster ? 750 : 1200;
  const height = poster ? 1334 : 630;
  const scoreSize = poster ? 92 : 88;
  const titleY = poster ? 118 : 108;
  const scoreY = poster ? 280 : 255;
  const issuesY = poster ? 485 : 365;
  const footerY = poster ? 1170 : 560;
  const topIssues = payload.topIssues.slice(0, poster ? 5 : 4);

  const issueLines = topIssues.map((issue, index) => {
    const y = issuesY + index * (poster ? 58 : 44);
    const color = issue.severity === "high" ? "#c2410c" : issue.severity === "medium" ? "#b45309" : "#4b5563";
    return `
      <text x="${poster ? 84 : 96}" y="${y}" font-size="${poster ? 28 : 24}" fill="${color}">${issue.severity === "high" ? "✗" : "•"}</text>
      <text x="${poster ? 120 : 130}" y="${y}" font-size="${poster ? 24 : 22}" fill="#1f2937">${escapeHtml(issue.title)}</text>
    `;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fcfbf8" />
      <stop offset="100%" stop-color="#f3ede2" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect x="${poster ? 36 : 48}" y="${poster ? 36 : 42}" width="${width - (poster ? 72 : 96)}" height="${height - (poster ? 72 : 84)}" rx="26" fill="#ffffff" stroke="#e5dfd2" />
  <text x="${poster ? 72 : 84}" y="${titleY}" font-size="${poster ? 28 : 26}" fill="#8a7f6f" letter-spacing="4">remei · 论文格式体检</text>
  <circle cx="${width / 2}" cy="${poster ? 245 : 220}" r="${poster ? 88 : 74}" fill="#eaf7ee" stroke="#49a266" stroke-width="6" />
  <text x="${width / 2}" y="${scoreY}" text-anchor="middle" font-size="${scoreSize}" font-weight="700" fill="#2f8551">${payload.score}</text>
  <text x="${width / 2}" y="${scoreY + (poster ? 40 : 34)}" text-anchor="middle" font-size="${poster ? 24 : 18}" fill="#2f8551">/ 100</text>
  <text x="${width / 2}" y="${poster ? 380 : 320}" text-anchor="middle" font-size="${poster ? 36 : 32}" font-weight="600" fill="#111827">发现 ${payload.totalIssues} 个格式问题</text>
  <text x="${width / 2}" y="${poster ? 425 : 355}" text-anchor="middle" font-size="${poster ? 24 : 20}" fill="#6b7280">其中 ${payload.fixableIssues} 个可一键修复</text>
  <text x="${width / 2}" y="${poster ? 460 : 388}" text-anchor="middle" font-size="${poster ? 24 : 20}" fill="#2563eb">${escapeHtml(payload.schoolName)}${payload.collegeName ? ` · ${escapeHtml(payload.collegeName)}` : ""}</text>
  ${issueLines}
  <text x="${poster ? 84 : 96}" y="${footerY}" font-size="${poster ? 24 : 20}" fill="#6b7280">已有 ${payload.totalUsers} 位同学使用 · 支持 ${payload.totalSchools} 所高校</text>
  <text x="${poster ? 84 : width - 240}" y="${footerY + (poster ? 44 : 34)}" font-size="${poster ? 20 : 16}" fill="#8a7f6f">分享 ID: ${escapeHtml(shareId)}</text>
  ${poster ? `<rect x="84" y="1208" width="582" height="74" rx="37" fill="#111827" />
  <text x="375" y="1254" text-anchor="middle" font-size="28" font-weight="600" fill="#ffffff">免费检测你的论文</text>` : ""}
</svg>`;
}

shareRoutes.post("/report", async (req, res, next) => {
  try {
    const command = parseShareReportCommand(req.body);
    const shareId = `share_${crypto.randomUUID().slice(0, 8)}`;
    const { payload, sourceJobId, docId, profileId } = await buildSharePayload(
      req,
      command.legacyDocId,
      command.checkResultLegacyDocId,
      shareId,
    );

    await shareRepo.createShareReport({
      shareId,
      fileId: command.legacyDocId,
      checkResultId: command.checkResultLegacyDocId,
      sourceJobId,
      docId,
      profileId,
      payloadJson: payload,
    });

    res.status(201).json({
      shareUrl: payload.shareUrl,
      shareTitle: payload.shareTitle,
      shareDesc: payload.shareDesc,
      ogImageUrl: payload.ogImageUrl,
      posterUrl: payload.posterUrl,
    });
  } catch (err) {
    next(err);
  }
});

shareRoutes.get("/report/:shareId", async (req, res, next) => {
  try {
    const report = await shareRepo.getShareReport(req.params.shareId);
    if (!report) {
      throw createError(404, ERROR_CODES.NOT_FOUND, "Share report not found");
    }

    const payload = report.payload_json as SharePayload;
    res.json({
      score: payload.score,
      totalIssues: payload.totalIssues,
      fixableIssues: payload.fixableIssues,
      topIssues: payload.topIssues,
      schoolName: payload.schoolName,
      collegeName: payload.collegeName,
      totalUsers: payload.totalUsers,
      totalSchools: payload.totalSchools,
    });
  } catch (err) {
    next(err);
  }
});

sharePageRoutes.get("/report/:shareId", async (req, res, next) => {
  try {
    const report = await shareRepo.getShareReport(req.params.shareId);
    if (!report) {
      throw createError(404, ERROR_CODES.NOT_FOUND, "Share report not found");
    }

    const payload = report.payload_json as SharePayload;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderSharePage(req.params.shareId, payload));
  } catch (err) {
    next(err);
  }
});

sharePageRoutes.get("/assets/:kind/:shareId.svg", async (req, res, next) => {
  try {
    const report = await shareRepo.getShareReport(req.params.shareId);
    if (!report) {
      throw createError(404, ERROR_CODES.NOT_FOUND, "Share report not found");
    }

    const kind = req.params.kind;
    if (kind !== "og" && kind !== "poster") {
      throw createError(404, ERROR_CODES.NOT_FOUND, "Asset not found");
    }

    const payload = report.payload_json as SharePayload;
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(renderOgSvg(req.params.shareId, payload, kind === "poster"));
  } catch (err) {
    next(err);
  }
});
