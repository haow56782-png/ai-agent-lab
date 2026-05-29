import React from 'react';
import type { FixRuntimeStore, TimelineRow, VisibleRuleCard } from './types';

interface Props {
  runtimeStore: FixRuntimeStore;
  timelineRows: TimelineRow[];
  leftRules: VisibleRuleCard[];
  hiddenRuleCount: number;
  activeThesisSubset?: string | null;
}

const SUBSET_LABEL: Record<string, string> = {
  page_canvas: '页面版心',
  cover: '封面',
  abstract_zh: '中文摘要',
  abstract_en: '英文摘要',
  toc: '目录',
  heading: '标题层级',
  paragraph: '正文段落',
  header_footer: '页眉页脚',
  page_number: '页码',
  table: '表格对象',
  figure: '图片对象',
  reference: '参考文献',
  footnote: '脚注',
  section_break: '分节符与分页',
};

function buildVisiblePages(totalPages: number, currentPage: number, rows: TimelineRow[]) {
  const rowPages = Array.from(new Set(rows.map((row) => row.page).filter(Boolean)));
  const seed = [currentPage, ...rowPages, 1, Math.max(1, Math.ceil(totalPages / 2)), totalPages]
    .filter((page) => page >= 1 && page <= totalPages);
  return Array.from(new Set(seed)).slice(0, 7);
}

export const FixRuntimeManuscriptMap: React.FC<Props> = ({
  runtimeStore,
  timelineRows,
  leftRules,
  hiddenRuleCount,
  activeThesisSubset,
}) => {
  const visiblePages = buildVisiblePages(runtimeStore.totalPages, runtimeStore.currentPage, timelineRows);
  const currentRule = leftRules[0] || null;
  const subsetLabel = activeThesisSubset
    ? SUBSET_LABEL[activeThesisSubset] || activeThesisSubset
    : '当前检测范围';
  const groupedRows = timelineRows.reduce<Record<number, TimelineRow[]>>((acc, row) => {
    acc[row.page] = [...(acc[row.page] ?? []), row];
    return acc;
  }, {});

  return (
    <aside className="fix-runtime-map" aria-label="稿纸地图和规则依据">
      <div className="fix-runtime-map-head">
        <div>
          <div className="fix-runtime-map-kicker">稿纸地图</div>
          <strong>{runtimeStore.totalItems} 个发现</strong>
        </div>
        <span className="fix-runtime-map-page">p.{runtimeStore.currentPage}</span>
      </div>

      <div className="fix-runtime-map-pages">
        {visiblePages.map((page) => {
          const rows = groupedRows[page] ?? [];
          const active = page === runtimeStore.currentPage;
          return (
            <button
              type="button"
              key={page}
              className={active ? 'fix-runtime-map-sheet is-active' : 'fix-runtime-map-sheet'}
              title={`第 ${page} 页 · ${rows.length} 个发现`}
            >
              <span className="fix-runtime-map-lines" aria-hidden="true">
                {Array.from({ length: 8 }).map((_, index) => (
                  <i key={index} style={{ width: `${[88, 64, 94, 76][index % 4]}%` }} />
                ))}
              </span>
              {rows.slice(0, 5).map((row, index) => (
                <span
                  key={row.id}
                  className={[
                    'fix-runtime-map-dot',
                    row.status === 'live' ? 'is-live' : '',
                    row.status === 'needs-review' ? 'is-review' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ top: `${22 + index * 13}%` }}
                />
              ))}
              <b>p.{page}</b>
            </button>
          );
        })}
      </div>

      <div className="fix-runtime-map-legend">
        <span><i className="is-done" />已写回</span>
        <span><i className="is-live" />有发现项</span>
        <span><i className="is-review" />待确认 / 复核</span>
      </div>

      <article className="fix-runtime-map-rule">
        <div className="fix-runtime-map-kicker">规则依据</div>
        <strong>{currentRule?.name || subsetLabel}</strong>
        <p>{currentRule?.summary || '系统会按当前命中的规则定位问题，其他检查项放到确认页统一复核。'}</p>
        <dl>
          <div>
            <dt>检测范围</dt>
            <dd>{subsetLabel}</dd>
          </div>
          <div>
            <dt>依据来源</dt>
            <dd>学校模板规范 + GB/T 7713.1</dd>
          </div>
          <div>
            <dt>隐藏规则</dt>
            <dd>{hiddenRuleCount} 条</dd>
          </div>
        </dl>
      </article>
    </aside>
  );
};
