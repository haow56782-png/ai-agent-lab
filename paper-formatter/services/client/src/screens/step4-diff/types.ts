import type { FindingDiffItem, RuleHitItem } from '../../api/client';

export interface DiffItem {
  findingId?: string;
  action: 'delete' | 'replace' | 'annotate' | 'format-hint';
  note: string;
  paraIndex: number;
  beforeText?: string;
  afterText?: string;
  hintTone?: 'school' | 'national';
}

export type { FindingDiffItem };

export interface RuleGroup {
  cat: string;
  items: RuleHitItem[];
}

interface ReviewItemBase {
  id: string;
  documentId?: string;
  label: string;
  cat: string;
  page: number;
  current: string;
  target: string;
  chapter: string;
  status: 'warn' | 'fail';
}

export interface LegacyReviewItem extends ReviewItemBase {
  findingId?: string;
}

export interface ReviewItem extends ReviewItemBase {
  // Canonical UI model: id and findingId are both the standard finding_id.
  findingId: string;
}

export interface PaperReviewAnchor {
  findingId: string;
  paragraphIndex: number;
  diff: DiffItem | null;
}

export interface PaperPage {
  pageNumber: number;
  paragraphList: string[];
  diffs: DiffItem[];
  reviewList: ReviewItem[];
  chapter: string;
  reviewAnchors: PaperReviewAnchor[];
}

export const PARAS_PER_PAGE = 28;
export const PAGE_NAV_ITEM_HEIGHT = 32;
export const PAGE_NAV_OVERSCAN = 6;
export const PAGE_NAV_MAX_VIEWPORT_HEIGHT = 480;
export const PAGE_OVERSCAN = 2;
export const REVIEW_OVERSCAN = 3;
export const REVIEW_CARD_ESTIMATE = 248;
export const A4_MARGIN_TOP = '11.7845%';
export const A4_MARGIN_RIGHT = '14.2857%';
export const A4_MARGIN_BOTTOM = '10.1010%';
export const A4_MARGIN_LEFT = '14.2857%';
