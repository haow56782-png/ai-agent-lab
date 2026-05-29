// ============================================================================
// 补丁三:analyze-job-runner.ts —— 接入学科推断与学科层注入
// ============================================================================
// 插入位置:detectionContext 构建之后、runFormatRuleDetectors 调用之前。
//
// 数据流:
//   解析产物 → inferDiscipline(detectionContext) → 三元组
//     ├─ confidence >= LOW:把 discipline-stem-rules.yaml 合入 profileRules.rules_json
//     │   (作为补充层;学校已有同名 canonical 规则优先,学科层只补缺)
//     └─ needsBanner:写进 job 结果的 disciplineHint,前端 Step4DiffBanner 读它决定是否浮现
//
// 关键:学科层注入只影响「合成出的规则集」→ 条目显隐走规则集,不走 banner。
// 即使 needsBanner=false(高置信静默),理工科条目照样自然出现在左栏。

/*
import { inferDiscipline } from "../../rules/discipline-inference.js";
import { loadDisciplineRuleLayer, mergeDisciplineLayer } from "../../rules/discipline-layer.js";

// ── detectionContext 构建之后 ──
const disciplineInference = inferDiscipline(detectionContext);

// 学科层注入:仅当 confidence 跨过低阈值(即判定为 stem)且学校未覆盖该细则时补入。
// mergeDisciplineLayer 内部按 canonical ruleId 去重:学校已有的不覆盖,只补缺。
let effectiveProfileRules = profileRules;
if (disciplineInference.discipline === "stem") {
  const stemLayer = loadDisciplineRuleLayer("stem"); // 读 discipline-stem-rules.yaml
  effectiveProfileRules = mergeDisciplineLayer(profileRules, stemLayer);
  // 用合并后的 profile 重建上下文,使 detector 与 canonicalize 都看到学科层
  detectionContext.profile = effectiveProfileRules;
}

const detectedRuleDetections = profileId
  ? sortDetectionsByPriority(canonicalizeRuleDetections({
      detections: runFormatRuleDetectors(detectionContext),
      profile: effectiveProfileRules,
    }))
  : [];

// ── job 结果里附带推断提示,供前端 banner 决策(不阻塞、可忽略)──
// 写入 analyze job 的输出对象(与 ruleDetails / logs 同级):
const disciplineHint = {
  discipline: disciplineInference.discipline,
  confidence: Number(disciplineInference.confidence.toFixed(3)),
  needsBanner: disciplineInference.needsBanner,
  bannerReason: disciplineInference.bannerReason,
  // 仅传 banner 文案所需的 top 信号,避免泄露全部打分细节
  topSignals: disciplineInference.signals
    .slice()
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)
    .map((s) => ({ label: s.label, detail: s.detail })),
};
*/

// ----------------------------------------------------------------------------
// 配套小工具:discipline-layer.ts(新建,约 40 行)
// ----------------------------------------------------------------------------
// loadDisciplineRuleLayer(name):读 yaml → 返回 rules 数组(带 ruleSource:"discipline")
// mergeDisciplineLayer(profile, layer):按 canonical ruleId 去重合并,学校优先。

/*
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { SchoolProfile } from "../repositories/profiles.js";

export function loadDisciplineRuleLayer(name: "stem"): any[] {
  const path = new URL(`./layers/discipline-${name}-rules.yaml`, import.meta.url);
  const doc = parseYaml(readFileSync(path, "utf8"));
  return (doc?.rules ?? []).map((r: any) => ({ ...r, ruleSource: "discipline" }));
}

export function mergeDisciplineLayer(
  profile: Pick<SchoolProfile, "rules_json" | "style_map"> | null | undefined,
  layer: any[],
): any { /* dedupe by canonical ruleId, school wins, append missing ones * / }
*/

// ----------------------------------------------------------------------------
// 前端对接(Step4DiffBanner.tsx):读 job 结果的 disciplineHint
// ----------------------------------------------------------------------------
// if (disciplineHint?.needsBanner) 渲染一个 "disciplineConfirm" 变体:
//   文案:"检测到大量公式与三线表,已按理工科规则校验"
//   动作:[改为文科] [说明] —— 忽略即保持;仅点击 [改为文科] 才触发规则重算。
// 重算路径复用 useDiffReviewController:切 discipline=humanities → 不注入 stem 层 → 局部 diff 重求值。

export {};
