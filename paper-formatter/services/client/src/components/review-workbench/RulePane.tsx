// RulePane shows the rule path for the focused finding.
// It writes focus only when a clicked rule has at least one mapped finding.
// The pane does not know about pages or cards; it subscribes to focusFindingId.
// Empty rule hits degrade to a toast instead of mutating focus.
import React, { useMemo } from 'react';
import { reviewActions, useReviewStore, type Finding } from '../../stores/reviewStore';

interface Props {
  findings: Finding[];
  onMissingFinding: (message: string) => void;
}

export const RulePane: React.FC<Props> = ({ findings, onMissingFinding }) => {
  const focusFindingId = useReviewStore((state) => state.focusFindingId);
  const focusedFinding = useReviewStore((state) => state.findings.find((finding) => finding.finding_id === state.focusFindingId) ?? null);

  const ruleGroups = useMemo(() => {
    const groups = new Map<string, Finding[]>();
    findings.forEach((finding) => {
      const key = finding.ruleBreadcrumb[0] || '规则包';
      groups.set(key, [...(groups.get(key) ?? []), finding]);
    });
    return Array.from(groups.entries());
  }, [findings]);

  return (
    <aside className="finding-rule-pane">
      <div className="finding-rule-sticky">
        <div className="finding-rule-title">适用规则</div>
        {findings.length === 0 ? (
          <div className="finding-rule-empty">暂无命中的规则路径</div>
        ) : (
          <div className="finding-rule-stack">
            {ruleGroups.map(([groupName, groupFindings]) => (
              <section key={groupName} className="finding-rule-group">
                <div className="finding-rule-group-title">{groupName}</div>
                {groupFindings.map((finding) => {
                  const isActive = finding.finding_id === focusFindingId;
                  const clause = finding.ruleBreadcrumb.slice(1).join(' · ') || finding.ruleId;
                  return (
                    <button
                      key={finding.finding_id}
                      type="button"
                      className={[
                        'finding-rule-card',
                        isActive ? 'is-active' : '',
                        finding.status !== 'pending' ? 'is-processed' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        if (!finding) {
                          onMissingFinding('这条规则暂时没有对应的发现项');
                          return;
                        }
                        reviewActions.setFocus(finding.finding_id, 'rule');
                      }}
                    >
                      <span>{clause}</span>
                      <strong>{finding.problem}</strong>
                      <small>本论文已触发 {groupFindings.filter((item) => item.ruleId === finding.ruleId).length} 次</small>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}

        {focusedFinding && (
          <div className="finding-rule-focus-path">
            {focusedFinding.ruleBreadcrumb.map((part, index) => (
              <React.Fragment key={`${part}-${index}`}>
                {index > 0 && <span>→</span>}
                <b>{part}</b>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
