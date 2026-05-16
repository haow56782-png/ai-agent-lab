import React from 'react';
import type { VisibleRuleCard } from './types';

const SUBSET_LABEL: Record<string, string> = {
  page_canvas: '页面版心',
  cover: '封面',
  originality_statement: '原创性声明',
  authorization: '授权书',
  abstract_zh: '中文摘要',
  abstract_en: '英文摘要',
  keywords: '关键词',
  toc: '目录',
  heading: '标题层级',
  paragraph: '正文段落',
  header_footer: '页眉页脚',
  page_number: '页码',
  formula: '公式',
  table: '表格对象',
  table_caption: '表题',
  continuation_table: '续表',
  figure: '图片对象',
  figure_caption: '图题',
  floating_object: '浮动对象',
  citation: '引用标注',
  reference: '参考文献',
  footnote: '脚注',
  appendix: '附录',
  acknowledgement: '致谢',
  translated_source: '外文原文及译文',
  section_break: '分节符与分页',
  directory_field: '自动目录域',
};

interface Props {
  isPageFlipping: boolean;
  leftRules: VisibleRuleCard[];
  hiddenRuleCount: number;
  ruleFlashId: 'school' | 'baseline' | null;
  activeThesisSubset?: string | null;
}

export const FixRuntimeRulesAside: React.FC<Props> = ({
  isPageFlipping,
  leftRules,
  hiddenRuleCount,
  ruleFlashId,
  activeThesisSubset,
}) => {
  const currentRule = leftRules[0] || null;
  const subsetLabel = activeThesisSubset
    ? SUBSET_LABEL[activeThesisSubset] || activeThesisSubset
    : '当前检测范围';
  const activeRuleSummary = currentRule?.summary || '系统会按当前命中的规则定位问题，其他检查项放到确认页统一复核。';
  return (
  <aside className={`fix-runtime-panel fix-runtime-panel-rules fix-runtime-note fix-runtime-note-left ${isPageFlipping ? 'is-page-flipping' : ''}`}>
    <div className="fix-runtime-note-head">规则依据</div>
    <div className="fix-runtime-note-stack is-quiet">
      <article
        className={[
          'fix-runtime-current-rule',
          'fix-runtime-current-rule-card',
          currentRule && ruleFlashId === (currentRule.source === '学校规则' ? 'school' : 'baseline') ? 'is-rule-hit' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="fix-runtime-note-kicker">依据来源</div>
        <strong>学校模板规范 + GB/T 7713.1</strong>
        <div className="fix-runtime-rule-sources fix-runtime-rule-sources-inline">
          <span>学校模板规范</span>
          <span>GB/T 7713.1-2025</span>
        </div>
        {currentRule ? (
          <>
            <div className="fix-runtime-rule-field">
              <span>当前命中问题</span>
              <b>{subsetLabel}</b>
            </div>
            <div className="fix-runtime-rule-field">
              <span>本次修复范围</span>
              <b>{currentRule.name}</b>
            </div>
            <div className="fix-runtime-note-detail">{activeRuleSummary}</div>
          </>
        ) : (
          <>
            <div className="fix-runtime-rule-field">
              <span>当前命中问题</span>
              <b>{subsetLabel}</b>
            </div>
            <div className="fix-runtime-note-detail">{activeRuleSummary}</div>
          </>
        )}
      </article>
      {hiddenRuleCount > 0 ? (
        <div className="fix-runtime-rule-actions">
          <button type="button" className="fix-runtime-rule-overflow">全部规则</button>
        </div>
      ) : null}
    </div>
  </aside>
);
};
