import { CAFA_RULE_SEED } from "./profile-rule-samples.js";
const baseMeta = {
    school: CAFA_RULE_SEED.school,
    ruleVersion: CAFA_RULE_SEED.ruleVersion,
    fixtureVersion: CAFA_RULE_SEED.fixtureVersion,
    baselineStandard: CAFA_RULE_SEED.baselineStandard,
};
export const CAFA_ANCHORED_FIXTURES = [
    {
        fixtureId: "cafa-fig-standard-001",
        ...baseMeta,
        scenarioTags: ["figure_caption", "normal", "style_check", "object_anchor"],
        documentObjects: [
            {
                objectId: "figure-1",
                type: "figure",
                page: 1,
                position: { top: 120, bottom: 250, left: 110, right: 420 },
            },
            {
                objectId: "fig-caption-1",
                type: "paragraph",
                page: 1,
                text: "图1-1 论文框架图",
                style: { align: "center", font: "宋体", sizePt: 10.5, bold: false, spacingBeforePt: 6, spacingAfterPt: 6 },
                position: { top: 264, bottom: 286, left: 130, right: 410 },
            },
        ],
        expectedRelations: [
            {
                relationId: "rel-fig-standard-001",
                fromObjectId: "fig-caption-1",
                toObjectId: "figure-1",
                relationType: "caption_belongs_to_figure",
                ruleId: "CAFA-FIG-CAPTION-001",
            },
        ],
        expectedFindings: [
            { ruleId: "CAFA-FIG-CAPTION-002", objectId: "fig-caption-1", status: "pass" },
            { ruleId: "CAFA-FIG-CAPTION-003", objectId: "fig-caption-1", status: "pass" },
            { ruleId: "CAFA-FIG-CAPTION-004", objectId: "fig-caption-1", status: "pass" },
        ],
    },
    {
        fixtureId: "cafa-fig-wrong-position-001",
        ...baseMeta,
        scenarioTags: ["figure_caption", "wrong_position", "object_anchor"],
        documentObjects: [
            {
                objectId: "fig-caption-2",
                type: "paragraph",
                page: 2,
                text: "图2-1 财务结构图",
                style: { align: "center", font: "宋体", sizePt: 10.5, bold: false },
                position: { top: 150, bottom: 172, left: 120, right: 400 },
            },
            {
                objectId: "figure-2",
                type: "figure",
                page: 2,
                position: { top: 188, bottom: 320, left: 110, right: 420 },
            },
        ],
        expectedRelations: [
            {
                relationId: "rel-fig-wrong-001",
                fromObjectId: "fig-caption-2",
                toObjectId: "figure-2",
                relationType: "caption_wrong_position",
                ruleId: "CAFA-FIG-CAPTION-001",
            },
        ],
    },
    {
        fixtureId: "cafa-fig-multi-wrap-001",
        ...baseMeta,
        scenarioTags: ["figure_caption", "multi_object_same_page", "caption_wrap_line", "body_reference_interference", "object_anchor"],
        documentObjects: [
            {
                objectId: "body-ref-fig-1",
                type: "paragraph",
                page: 3,
                text: "如图2-1所示，中国石油财务绩效呈现波动。",
                style: { align: "justify", font: "宋体", sizePt: 12, bold: false },
                position: { top: 100, bottom: 118, left: 90, right: 470 },
            },
            {
                objectId: "figure-3a",
                type: "figure",
                page: 3,
                position: { top: 140, bottom: 240, left: 90, right: 250 },
            },
            {
                objectId: "fig-caption-3a",
                type: "paragraph",
                page: 3,
                text: "图2-1 中国石油\n财务结构图",
                style: { align: "center", font: "宋体", sizePt: 10.5, bold: false },
                position: { top: 248, bottom: 282, left: 92, right: 252 },
            },
            {
                objectId: "figure-3b",
                type: "figure",
                page: 3,
                position: { top: 140, bottom: 240, left: 300, right: 460 },
            },
            {
                objectId: "fig-caption-3b",
                type: "paragraph",
                page: 3,
                text: "图2-2 杜邦分析体系",
                style: { align: "center", font: "宋体", sizePt: 10.5, bold: false },
                position: { top: 248, bottom: 270, left: 302, right: 462 },
            },
        ],
        expectedRelations: [
            {
                relationId: "rel-fig-multi-001",
                fromObjectId: "fig-caption-3a",
                toObjectId: "figure-3a",
                relationType: "caption_belongs_to_figure",
                ruleId: "CAFA-FIG-CAPTION-001",
            },
            {
                relationId: "rel-fig-multi-002",
                fromObjectId: "fig-caption-3b",
                toObjectId: "figure-3b",
                relationType: "caption_belongs_to_figure",
                ruleId: "CAFA-FIG-CAPTION-001",
            },
        ],
        expectedFindings: [
            {
                ruleId: "CAFA-FIG-CAPTION-005",
                objectId: "body-ref-fig-1",
                status: "pass",
                reason: "正文引用不得识别为图题",
            },
        ],
    },
    {
        fixtureId: "cafa-table-standard-001",
        ...baseMeta,
        scenarioTags: ["table_caption", "normal", "style_check", "object_anchor"],
        documentObjects: [
            {
                objectId: "table-caption-1",
                type: "paragraph",
                page: 4,
                text: "表3-1 财务指标汇总",
                style: { align: "center", font: "宋体", sizePt: 10.5, bold: false, spacingBeforePt: 6, spacingAfterPt: 6 },
                position: { top: 120, bottom: 142, left: 120, right: 420 },
            },
            {
                objectId: "table-1",
                type: "table",
                page: 4,
                position: { top: 150, bottom: 300, left: 100, right: 440 },
            },
        ],
        expectedRelations: [
            {
                relationId: "rel-table-standard-001",
                fromObjectId: "table-caption-1",
                toObjectId: "table-1",
                relationType: "caption_belongs_to_table",
                ruleId: "CAFA-TABLE-CAPTION-001",
            },
        ],
        expectedFindings: [
            { ruleId: "CAFA-TABLE-CAPTION-002", objectId: "table-caption-1", status: "pass" },
            { ruleId: "CAFA-TABLE-CAPTION-003", objectId: "table-caption-1", status: "pass" },
            { ruleId: "CAFA-TABLE-CAPTION-004", objectId: "table-caption-1", status: "pass" },
        ],
    },
    {
        fixtureId: "cafa-table-wrong-position-continued-001",
        ...baseMeta,
        scenarioTags: ["table_caption", "wrong_position", "multi_object_same_page", "continued_table", "body_reference_interference", "object_anchor"],
        documentObjects: [
            {
                objectId: "body-ref-table-1",
                type: "paragraph",
                page: 5,
                text: "见表3-1，可知指标存在阶段性波动。",
                style: { align: "justify", font: "宋体", sizePt: 12, bold: false },
                position: { top: 96, bottom: 114, left: 90, right: 470 },
            },
            {
                objectId: "table-main-1",
                type: "table",
                page: 5,
                position: { top: 130, bottom: 220, left: 90, right: 460 },
            },
            {
                objectId: "table-caption-wrong-1",
                type: "paragraph",
                page: 5,
                text: "表3-1 财务指标汇总",
                style: { align: "center", font: "宋体", sizePt: 10.5, bold: false },
                position: { top: 228, bottom: 250, left: 120, right: 430 },
            },
            {
                objectId: "table-continued-1",
                type: "table",
                page: 5,
                position: { top: 280, bottom: 360, left: 90, right: 460 },
            },
            {
                objectId: "table-caption-continued-1",
                type: "paragraph",
                page: 5,
                text: "续表3-1 财务指标续表",
                style: { align: "center", font: "宋体", sizePt: 10.5, bold: false },
                position: { top: 258, bottom: 276, left: 120, right: 430 },
            },
        ],
        expectedRelations: [
            {
                relationId: "rel-table-wrong-001",
                fromObjectId: "table-caption-wrong-1",
                toObjectId: "table-main-1",
                relationType: "caption_wrong_position",
                ruleId: "CAFA-TABLE-CAPTION-001",
            },
            {
                relationId: "rel-table-continued-001",
                fromObjectId: "table-caption-continued-1",
                toObjectId: "table-continued-1",
                relationType: "caption_belongs_to_table",
                ruleId: "CAFA-TABLE-CAPTION-006",
            },
        ],
        expectedFindings: [
            {
                ruleId: "CAFA-TABLE-CAPTION-005",
                objectId: "body-ref-table-1",
                status: "pass",
                reason: "正文引用不得识别为表题",
            },
        ],
    },
];
export const cafaFixtureCoverageMatrix = [
    {
        fixtureId: "cafa-fig-standard-001",
        ...baseMeta,
        scenarioTags: ["figure_caption", "normal", "style_check", "object_anchor"],
        ruleIds: [
            "CAFA-FIG-CAPTION-001",
            "CAFA-FIG-CAPTION-002",
            "CAFA-FIG-CAPTION-003",
            "CAFA-FIG-CAPTION-004",
        ],
    },
    {
        fixtureId: "cafa-fig-wrong-position-001",
        ...baseMeta,
        scenarioTags: ["figure_caption", "wrong_position", "object_anchor"],
        ruleIds: ["CAFA-FIG-CAPTION-001"],
    },
    {
        fixtureId: "cafa-fig-multi-wrap-001",
        ...baseMeta,
        scenarioTags: ["figure_caption", "multi_object_same_page", "caption_wrap_line", "body_reference_interference", "object_anchor"],
        ruleIds: ["CAFA-FIG-CAPTION-001", "CAFA-FIG-CAPTION-005"],
    },
    {
        fixtureId: "cafa-table-standard-001",
        ...baseMeta,
        scenarioTags: ["table_caption", "normal", "style_check", "object_anchor"],
        ruleIds: [
            "CAFA-TABLE-CAPTION-001",
            "CAFA-TABLE-CAPTION-002",
            "CAFA-TABLE-CAPTION-003",
            "CAFA-TABLE-CAPTION-004",
        ],
    },
    {
        fixtureId: "cafa-table-wrong-position-continued-001",
        ...baseMeta,
        scenarioTags: ["table_caption", "wrong_position", "multi_object_same_page", "continued_table", "body_reference_interference", "object_anchor"],
        ruleIds: [
            "CAFA-TABLE-CAPTION-001",
            "CAFA-TABLE-CAPTION-005",
            "CAFA-TABLE-CAPTION-006",
        ],
    },
];
