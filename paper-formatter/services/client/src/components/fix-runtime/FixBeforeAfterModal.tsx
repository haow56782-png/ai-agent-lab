import React from 'react';
import type { TimelineRow } from './types';

interface Props {
  row: TimelineRow | null;
  onClose: () => void;
}

function isPageLayoutRow(row: TimelineRow) {
  const signal = `${row.findingTitle} ${row.findingLabel} ${row.ruleLabel}`.toLowerCase();
  return /页边距|页面|版心|纸张|装订线|page|margin|canvas/.test(signal);
}

function splitActionSummary(row: TimelineRow) {
  if (isPageLayoutRow(row)) {
    return {
      before: '页面版心与学校模板要求不一致，正文区域需要重新对齐。',
      after: '页面边距与正文区域已按学校模板和 GB/T 7713.1 对齐。',
    };
  }
  if (/标题|层级|编号/.test(`${row.findingTitle} ${row.ruleLabel}`)) {
    return {
      before: '标题层级、字号或段前段后与模板要求不一致。',
      after: '标题格式已按学校模板统一，标题文字保持不变。',
    };
  }
  return {
    before: '系统已定位到该处格式问题。',
    after: '格式属性已按规则写回，正文文字保持不变。',
  };
}

export const FixBeforeAfterModal: React.FC<Props> = ({ row, onClose }) => {
  if (!row) return null;
  const { before, after } = splitActionSummary(row);

  return (
    <div className="fix-compare-modal-backdrop" role="dialog" aria-modal="true" aria-label="修复前后对比">
      <div className="fix-compare-modal">
        <div className="fix-compare-modal-head">
          <div>
            <div className="mono">FORMAT REVIEW</div>
            <h3>{row.findingTitle}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭修复前后对比">×</button>
        </div>
        <div className="fix-compare-grid">
          <section>
            <span>修复前</span>
            <p>{before}</p>
          </section>
          <section>
            <span>修复后</span>
            <p>{after}</p>
          </section>
        </div>
        <div className="fix-compare-scope">
          <strong>改动范围</strong>
          <span>仅调整字体、字号、段落、编号或版式属性，不改论文正文内容。</span>
        </div>
      </div>
    </div>
  );
};
