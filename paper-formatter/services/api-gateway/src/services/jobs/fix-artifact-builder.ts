import type { FixJobArtifact, FixJobEvent, FixType } from "../../../../../packages/shared-types/src/job-contract";
import { matchFindingForFixType, matchFormatterFindingIdForFixType } from "../../rules/fix-type-matcher.js";
import type { FixSourceContext } from "./fix-source-context.js";

export const FIX_SUMMARIES: Record<FixType, string> = {
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

export function makeFixEvent(eventFields: {
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
    ...eventFields,
  };
}

function pickSourceLine(sourceLines: string[], sourceIndex: number, fallback: string): string {
  if (sourceLines.length === 0) return fallback;
  return sourceLines[sourceIndex % sourceLines.length];
}

export function getFixArtifactDetailText(fixType: FixType): string {
  return FIX_ARTIFACT_DETAILS[fixType].join("；");
}

export function makeFixArtifact(
  fixType: FixType,
  sourceContext: FixSourceContext,
  sourceIndex: number,
  formatterDiff?: any,
): FixJobArtifact {
  const sourceSnippet = pickSourceLine(sourceContext.snippets, sourceIndex, "当前修复来自原稿解析结果，正文内容保持不改。");
  const chapter = pickSourceLine(sourceContext.chapters, sourceIndex, "正文排版区域");
  const formatterFindingId = matchFormatterFindingIdForFixType(formatterDiff, fixType, sourceIndex);
  const matchedFinding = formatterFindingId
    ? sourceContext.findings.find((candidateFinding) => candidateFinding.finding_id === formatterFindingId) ?? null
    : matchFindingForFixType(fixType, sourceContext.findings, sourceIndex);
  const findingId = formatterFindingId || matchedFinding?.finding_id;

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
