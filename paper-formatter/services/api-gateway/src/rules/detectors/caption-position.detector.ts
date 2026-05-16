import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
import type { CaptionAnchorRelation } from "../evaluators/caption-anchor-evaluator.js";
import { buildCaptionAnchorObjectsFromParsedContext, evaluateCaptionAnchors } from "../evaluators/caption-anchor-evaluator.js";

export const FIGURE_CAPTION_POSITION_RULE_ID = "FIGURE_CAPTION_POSITION_REVIEW";
export const FIGURE_CAPTION_POSITION_LABEL = "图题居下居中";
export const TABLE_CAPTION_POSITION_RULE_ID = "TABLE_CAPTION_POSITION_REVIEW";
export const TABLE_CAPTION_POSITION_LABEL = "表题居上";

function findParagraphByIndex(paragraphs: any[], paragraphIndex: number) {
  return paragraphs[paragraphIndex] ?? paragraphs.find((paragraph: any) => Number(paragraph?.index || -1) === paragraphIndex) ?? null;
}

function createDetection(input: {
  ruleId: string;
  label: string;
  snippet: string;
  explanation: string;
  paragraphIndex: number;
  relation: CaptionAnchorRelation;
}): RuleDetection {
  return {
    ruleId: input.ruleId,
    label: input.label,
    group: "图表 & 题注",
    severity: "P2",
    confidence: 0.72,
    page: Math.max(1, Math.floor(input.paragraphIndex / 8) + 1),
    snippet: input.snippet,
    evidence: {
      paragraphIndex: input.paragraphIndex,
      anchor: {
        relationId: input.relation.relationId,
        fromObjectId: input.relation.fromObjectId,
        toObjectId: input.relation.toObjectId,
        relationType: input.relation.relationType,
        captionKind: input.relation.captionKind,
      },
    },
    suggestion: {
      type: "restructure",
      before: input.snippet,
      after: `按模板统一${input.label}`,
      explanation: input.explanation,
    },
  };
}

function isCaptionStyleTemplateFinding(detection: RuleDetection): boolean {
  const relationType = detection.evidence?.anchor?.relationType;
  return (detection.ruleId === FIGURE_CAPTION_POSITION_RULE_ID || detection.ruleId === TABLE_CAPTION_POSITION_RULE_ID)
    && relationType !== "caption_wrong_position"
    && relationType !== "caption_unbound";
}

function aggregateCaptionStyleDetections(detections: RuleDetection[]): RuleDetection[] {
  const output: RuleDetection[] = [];
  const styleGroups = new Map<string, { detection: RuleDetection; count: number }>();

  for (const detection of detections) {
    if (!isCaptionStyleTemplateFinding(detection)) {
      output.push(detection);
      continue;
    }

    const current = styleGroups.get(detection.ruleId);
    if (!current) {
      styleGroups.set(detection.ruleId, { detection, count: 1 });
      continue;
    }
    current.count += 1;
    current.detection.confidence = Math.max(current.detection.confidence, detection.confidence);
  }

  for (const { detection, count } of styleGroups.values()) {
    output.push(count > 1
      ? {
        ...detection,
        snippet: `${detection.snippet}（同类题注 ${count} 处）`,
        suggestion: {
          ...detection.suggestion,
          explanation: `检测到 ${count} 处${detection.label}样式不一致；同一模板样式可批量修复，当前 finding 以首个对象锚点作为证据。`,
        },
      }
      : detection);
  }

  return output.sort((left, right) => {
    if (left.page !== right.page) return left.page - right.page;
    return (left.evidence?.paragraphIndex ?? 0) - (right.evidence?.paragraphIndex ?? 0);
  });
}

export function detectCaptionPosition(ctx: ParsedDocumentContext): RuleDetection[] {
  const detections: RuleDetection[] = [];
  const relations = evaluateCaptionAnchors(buildCaptionAnchorObjectsFromParsedContext(ctx));
  const structureItems = ctx.structureItems || [];
  const seenParagraphs = new Set<number>();

  for (const relation of relations) {
    const itemType = relation.captionKind === "figure" ? "figure_caption" : "table_caption";
    const structureItem = structureItems.find((item: any) => item?.type === itemType && `caption:${item.type}:${Number(item?.index ?? -1)}` === relation.fromObjectId);
    if (!structureItem) continue;
    const paragraphIndex = Number(structureItem.index || 0);
    if (seenParagraphs.has(paragraphIndex)) continue;
    const paragraph = findParagraphByIndex(ctx.paragraphs || [], paragraphIndex);
    if (!paragraph) continue;

    if (relation.captionKind === "figure") {
      const figureCaptionAboveImage = relation.relationType === "caption_wrong_position";
      if (paragraph.alignment !== "center" || figureCaptionAboveImage) {
        detections.push(createDetection({
          ruleId: FIGURE_CAPTION_POSITION_RULE_ID,
          label: FIGURE_CAPTION_POSITION_LABEL,
          snippet: String(structureItem.text || "").trim().slice(0, 180) || "图题位置需要人工复核。",
          explanation: figureCaptionAboveImage
            ? "检测到图题出现在图片前方，建议按模板将图题放在图片下方并居中。"
            : "检测到图题不是居中对齐，建议按模板将图题放在图片下方并居中。",
          paragraphIndex,
          relation,
        }));
        seenParagraphs.add(paragraphIndex);
      }
      continue;
    }

    const tableCaptionBelowTable = relation.relationType === "caption_wrong_position";
    if (paragraph.alignment === "right" || tableCaptionBelowTable) {
      detections.push(createDetection({
        ruleId: TABLE_CAPTION_POSITION_RULE_ID,
        label: TABLE_CAPTION_POSITION_LABEL,
        snippet: String(structureItem.text || "").trim().slice(0, 180) || "表题位置需要人工复核。",
        explanation: tableCaptionBelowTable
          ? "检测到表题出现在表格之后，建议按模板将表题放在表格上方。"
          : "检测到表题位置或对齐方式异常，建议按模板将表题放在表格上方并统一对齐。",
        paragraphIndex,
        relation,
      }));
      seenParagraphs.add(paragraphIndex);
    }
  }

  return aggregateCaptionStyleDetections(detections);
}

export const captionPositionDetector: FormatRuleDetector = {
  ruleId: FIGURE_CAPTION_POSITION_RULE_ID,
  label: FIGURE_CAPTION_POSITION_LABEL,
  group: "图表 & 题注",
  severity: "P2",
  detect: detectCaptionPosition,
};
