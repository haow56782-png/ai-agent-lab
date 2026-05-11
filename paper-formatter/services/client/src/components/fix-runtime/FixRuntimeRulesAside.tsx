import React from 'react';
import type { VisibleRuleCard } from './types';

interface Props {
  isPageFlipping: boolean;
  leftRules: VisibleRuleCard[];
  hiddenRuleCount: number;
  ruleFlashId: 'school' | 'baseline' | null;
}

export const FixRuntimeRulesAside: React.FC<Props> = ({
  isPageFlipping,
  leftRules,
  hiddenRuleCount,
  ruleFlashId,
}) => (
  <aside className={`fix-runtime-note fix-runtime-note-left ${isPageFlipping ? 'is-page-flipping' : ''}`}>
    <div className="fix-runtime-note-head">适用规则</div>
    <div className="fix-runtime-note-columns">
      <span>学校规则 · 中国科学技术大学 vAuto</span>
      <span>国标基线 · GB/T 7713.1-2025</span>
    </div>
    <div className="fix-runtime-note-stack">
      {leftRules.map((rule) => (
        <article
          key={rule.id}
          className={[
            'fix-runtime-rule-card',
            ruleFlashId === (rule.source === '学校规则' ? 'school' : 'baseline') ? 'is-rule-hit' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="fix-runtime-note-kicker">{rule.source}</div>
          <div className="fix-runtime-rule-code">{rule.code}</div>
          <div className="fix-runtime-note-anchor">{rule.name}</div>
          <div className="fix-runtime-note-detail">{rule.summary}</div>
          <div className="fix-runtime-rule-hitcount">本论文已触发 {rule.hitCount} 次</div>
        </article>
      ))}
      {hiddenRuleCount > 0 && (
        <article className="fix-runtime-rule-overflow">+{hiddenRuleCount} 条</article>
      )}
    </div>
  </aside>
);
