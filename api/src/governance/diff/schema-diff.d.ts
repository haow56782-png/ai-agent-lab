/** ============================================================
 *  Schema Diff — Compares expected vs actual type schemas
 *  to detect type-level drift.
 *  ============================================================ */
import type { SchemaDiffResult } from "./diff-types.js";
export interface ExpectedSchema {
    name: string;
    fields: SchemaField[];
}
export interface SchemaField {
    name: string;
    type: string;
    required: boolean;
}
export interface ActualSchema {
    name: string;
    fields: SchemaField[];
}
/**
 * Compare frozen schema against implemented schema.
 */
export declare function diffSchemas(schemaName: string, expected: ExpectedSchema[], actual: ActualSchema[]): SchemaDiffResult;
//# sourceMappingURL=schema-diff.d.ts.map