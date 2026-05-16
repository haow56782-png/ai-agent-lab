import { detectFigures, type RawFigure } from './figure-detector.ts';
import { detectHeadings, type RawParagraph } from './heading-detector.ts';
import { detectHeadersFooters, type RawHeaderFooter } from './header-footer-detector.ts';
import { detectParagraphs } from './paragraph-detector.ts';
import { detectReferences } from './reference-detector.ts';
import { detectTables, type TableRecognition } from './table-detector.ts';
import type { RawTable } from './continuation-table-detector.ts';
import type { WordSystemWarning } from './rule-engine.ts';

export interface RawWordStructureInput {
  metadata?: Record<string, unknown>;
  paragraphs: RawParagraph[];
  figures?: RawFigure[];
  tables?: RawTable[];
  headersFooters?: RawHeaderFooter[];
}

export interface WordStructureJson {
  metadata: Record<string, unknown>;
  headings: ReturnType<typeof detectHeadings>;
  paragraphs: ReturnType<typeof detectParagraphs>;
  figures: ReturnType<typeof detectFigures>;
  tables: TableRecognition[];
  references: ReturnType<typeof detectReferences>;
  headersFooters: ReturnType<typeof detectHeadersFooters>;
  warnings: WordSystemWarning[];
}

export function detectWordStructure(input: RawWordStructureInput): WordStructureJson {
  const headings = detectHeadings(input.paragraphs);
  const paragraphs = detectParagraphs(input.paragraphs);
  const figures = detectFigures(input.figures || [], input.paragraphs);
  const tables = detectTables(input.tables || []);
  const references = detectReferences(input.paragraphs);
  const headersFooters = detectHeadersFooters(input.headersFooters || []);
  const warnings = [
    ...headings.flatMap(heading => heading.warnings),
    ...figures.flatMap(figure => figure.warnings),
    ...tables.flatMap(table => table.warnings),
  ];

  return {
    metadata: input.metadata || {},
    headings,
    paragraphs,
    figures,
    tables,
    references,
    headersFooters,
    warnings,
  };
}

