export interface CafaRuleSeed {
    school: "CAFA";
    ruleVersion: string;
    fixtureVersion: string;
    baselineStandard: string;
    rules: CafaRule[];
}
export interface CafaRule {
    ruleId: string;
    category: "figureCaption" | "tableCaption" | "style" | "numbering" | "position" | "spacing";
    target: "figure" | "table" | "caption" | "paragraph";
    description: string;
    expected: Record<string, unknown>;
    severity: "error" | "warning";
}
export interface CafaAnchoredFixture {
    fixtureId: string;
    school: "CAFA";
    ruleVersion: string;
    fixtureVersion: string;
    baselineStandard: string;
    scenarioTags: string[];
    documentObjects: CafaDocumentObject[];
    expectedRelations: CafaExpectedRelation[];
    expectedFindings?: CafaExpectedFinding[];
}
export interface CafaDocumentObject {
    objectId: string;
    type: "paragraph" | "figure" | "table";
    page?: number;
    text?: string;
    style?: Record<string, unknown>;
    position?: Record<string, unknown>;
}
export interface CafaExpectedRelation {
    relationId: string;
    fromObjectId: string;
    toObjectId: string;
    relationType: "caption_belongs_to_figure" | "caption_belongs_to_table" | "caption_wrong_position" | "caption_unbound";
    ruleId: string;
}
export interface CafaExpectedFinding {
    ruleId: string;
    objectId: string;
    status: "pass" | "fail";
    reason?: string;
}
export interface CafaCoverageMatrixItem {
    fixtureId: string;
    school: "CAFA";
    ruleVersion: string;
    fixtureVersion: string;
    baselineStandard: string;
    scenarioTags: string[];
    ruleIds: string[];
}
export declare const CAFA_P0_SCENARIO_TAGS: readonly ["figure_caption", "table_caption", "normal", "wrong_position", "multi_object_same_page", "caption_wrap_line", "body_reference_interference", "continued_table", "style_check", "object_anchor"];
export type CafaP0ScenarioTag = (typeof CAFA_P0_SCENARIO_TAGS)[number];
