export type CanonicalRuleType = "format" | "content" | "structure" | "layout";
export type ThesisObjectSubset = "page_canvas" | "cover" | "originality_statement" | "authorization" | "abstract_zh" | "abstract_en" | "keywords" | "toc" | "heading" | "paragraph" | "header_footer" | "page_number" | "formula" | "table" | "table_caption" | "continuation_table" | "figure" | "figure_caption" | "floating_object" | "citation" | "reference" | "footnote" | "appendix" | "acknowledgement" | "translated_source" | "section_break" | "directory_field";
export interface CanonicalRuleGroup {
    cat: string;
    thesisSubset: ThesisObjectSubset;
    targetObject: string;
    uiSection: string;
    items: string[];
}
export interface CanonicalRuleCatalogEntry {
    ruleId: string;
    label: string;
    category: string;
    categoryCode: string;
    description: string;
    type: CanonicalRuleType;
    source: "school" | "gb" | "system";
    thesisSubset: ThesisObjectSubset;
    targetObject: string;
    uiSection: string;
}
export declare const REQUIRED_THESIS_SUBSETS: ThesisObjectSubset[];
export declare const CANONICAL_RULE_GROUPS: CanonicalRuleGroup[];
export declare function buildCanonicalRuleCatalog(): CanonicalRuleCatalogEntry[];
