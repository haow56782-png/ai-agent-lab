import type { AnalyzeJobCommand, FixJobCommand, FormatJobCommand, LegacyDocumentCommand } from "../../../../packages/shared-types/src/job-contract";
export declare function parseLegacyDocumentCommand(body: unknown, fieldName?: string): LegacyDocumentCommand;
export declare function parseAnalyzeJobCommand(body: unknown): AnalyzeJobCommand;
export declare function parseFormatJobCommand(body: unknown): FormatJobCommand;
export declare function parseFixJobCommand(body: unknown): FixJobCommand;
