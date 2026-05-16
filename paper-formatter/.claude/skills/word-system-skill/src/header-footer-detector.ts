export interface RawHeaderFooter {
  sectionId: string;
  pageIndex: number;
  headerText?: string;
  footerText?: string;
  pageNumber?: string;
  firstPageDifferent?: boolean;
  oddEvenDifferent?: boolean;
}

export interface HeaderFooterRecognition extends RawHeaderFooter {
  headerRuleMatched: boolean;
  footerRuleMatched: boolean;
  issues: string[];
  warnings: string[];
}

export function detectHeadersFooters(items: RawHeaderFooter[]): HeaderFooterRecognition[] {
  return items.map(item => {
    const issues: string[] = [];
    if (!item.headerText?.trim()) issues.push('missing_header_text');
    if (!item.pageNumber?.trim()) issues.push('missing_page_number');
    return {
      ...item,
      headerRuleMatched: Boolean(item.headerText?.trim()),
      footerRuleMatched: Boolean(item.footerText?.trim() || item.pageNumber?.trim()),
      issues,
      warnings: item.firstPageDifferent || item.oddEvenDifferent ? ['section_specific_header_footer'] : [],
    };
  });
}

