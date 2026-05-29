// ============================================================================
// 补丁一 · A:rule-types.ts —— RuleDetection 增加 ruleSource 字段
// ============================================================================
// 在 RuleDetection 接口里(severity 同级)新增以下字段。权重排序依赖它。
// ruleSource 由 detector 产出时填写,或在 canonicalize 阶段从规则库回填。

/*
export type RuleSource = "user" | "school" | "discipline" | "CAFA" | "GB" | "system";

export interface RuleDetection {
  detectorRuleId?: string;
  canonicalMapping?: CanonicalRuleMapping;
  ruleId: string;
  label: string;
  group: string;
  severity: RuleSeverity;
  ruleSource?: RuleSource;   // ← 新增。缺省视为 "system"(最低权重)。
  confidence: number;
  // ...其余字段不变
}
*/

// ============================================================================
// 补丁一 · B:priority.ts —— 用 ruleSource 权重表替换硬编码 ruleRank
// ============================================================================
// 直接整文件替换 services/api-gateway/src/rules/priority.ts。
// 权重表与 rule-priority.yaml 一致;学科层 discipline=250,插在 school 与 GB 之间。

import { FLOATING_OBJECT_OVERLAP_RULE_ID } from "./detectors/floating-object-overlap.detector.js";
import type { RuleDetection, RuleSeverity } from "./rule-types.js";

const SEVERITY_SCORE: Record<RuleSeverity, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

/**
 * ruleSource 权重(越大越优先)。与 rule-priority.yaml 的 priorityOrder 对齐。
 * 排序时用「负权重」参与升序比较,使高权重排在前。
 */
const RULE_SOURCE_WEIGHT: Record<string, number> = {
  user: 500,
  school: 400,
  CAFA: 300,
  discipline: 250, // ← 学科层:介于 school(400)与 GB(200)之间
  GB: 200,
  system: 100,
};

function sourceWeight(detection: RuleDetection): number {
  const source = (detection as any).ruleSource as string | undefined;
  return RULE_SOURCE_WEIGHT[source ?? "system"] ?? RULE_SOURCE_WEIGHT.system;
}

/**
 * 同权重内的细粒度排序仍保留两条业务特例:
 * 浮动对象覆盖正文 > 表格保持完整 > 其余。
 */
function ruleRank(ruleId: string): number {
  if (ruleId === FLOATING_OBJECT_OVERLAP_RULE_ID) return 0;
  if (ruleId === "TABLE_KEEP_TOGETHER") return 1;
  return 10;
}

export function sortDetectionsByPriority(detections: RuleDetection[]): RuleDetection[] {
  return [...detections].sort((left, right) => {
    // 1) 严重度优先(P0 在前)
    const severityDelta = SEVERITY_SCORE[left.severity] - SEVERITY_SCORE[right.severity];
    if (severityDelta !== 0) return severityDelta;

    // 2) 同严重度下按 ruleSource 权重(高权重在前 → 负向比较)
    const weightDelta = sourceWeight(right) - sourceWeight(left);
    if (weightDelta !== 0) return weightDelta;

    // 3) 业务特例细排
    const ruleDelta = ruleRank(left.ruleId) - ruleRank(right.ruleId);
    if (ruleDelta !== 0) return ruleDelta;

    // 4) 置信度兜底(高置信在前)
    return right.confidence - left.confidence;
  });
}
