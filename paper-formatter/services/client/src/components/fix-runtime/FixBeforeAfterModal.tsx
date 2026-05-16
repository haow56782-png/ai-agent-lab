import React from 'react';
import type { TimelineRow } from './types';

interface Props {
  row: TimelineRow | null;
  onClose: () => void;
}

function splitActionSummary(row: TimelineRow) {
  const [before = '系统已定位到该处格式问题', after = row.recentActionSummary] = row.recentActionSummary.split('；');
  return { before, after };
}

export const FixBeforeAfterModal: React.FC<Props> = ({ row, onClose }) => {
  if (!row) return null;
  const { before, after } = splitActionSummary(row);

  return (
    <div className="fix-compare-modal-backdrop" role="dialog" aria-modal="true" aria-label="修复前后对比">
      <div className="fix-compare-modal">
        <div className="fix-compare-modal-head">
          <div>
            <div className="mono">FORMAT DIFF</div>
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
