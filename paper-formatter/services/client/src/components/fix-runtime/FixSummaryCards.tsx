import React from 'react';
import type { FixFindingStatusSummary, FixTaskFilter } from './types';

interface Props {
  summary: FixFindingStatusSummary;
  activeFilter: FixTaskFilter;
  onFilterChange: (filter: FixTaskFilter) => void;
}

const FILTER_CARDS: Array<{
  key: FixTaskFilter;
  testId: string;
  label: string;
  valueKey: keyof FixFindingStatusSummary;
  tone: 'done' | 'review' | 'manual';
}> = [
  { key: 'written', testId: 'written', label: '已自动修复', valueKey: 'writtenBack', tone: 'done' },
  { key: 'review', testId: 'review', label: '待你确认', valueKey: 'needsReview', tone: 'review' },
  { key: 'manual', testId: 'manual', label: '暂未处理', valueKey: 'notAutoFixed', tone: 'manual' },
];

export const FixSummaryCards: React.FC<Props> = ({ summary, activeFilter, onFilterChange }) => (
  <div className="fix-runtime-summary-grid" data-testid="fix-runtime-finding-status-summary">
    {FILTER_CARDS.map((card) => (
      <button
        key={card.key}
        type="button"
        data-testid={`fix-runtime-finding-status-${card.testId}`}
        className={[
          'fix-runtime-summary-card',
          `tone-${card.tone}`,
          activeFilter === card.key ? 'is-active' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => onFilterChange(activeFilter === card.key ? 'all' : card.key)}
        title={`筛选${card.label}的发现项`}
      >
        <span className="mono">{card.label}</span>
        <strong className="serif num">{summary[card.valueKey]}</strong>
      </button>
    ))}
  </div>
);
