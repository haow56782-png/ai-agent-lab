import React from 'react';
import { Btn, ScoreBlock } from './Common';
import type { RuleHitItem } from '../api/client';

interface RulePanelData {
  ruleListRef: React.RefObject<HTMLDivElement | null>;
  activeRuleRef: React.RefObject<HTMLButtonElement | null>;
  allRules: RuleHitItem[];
  ruleGroups: { cat: string; items: RuleHitItem[] }[];
  displayGroups: { key: string; cat: string; items: RuleHitItem[] }[];
  activeRule: RuleHitItem | null;
  expandedWarn: string | null;
  ignoreInput: string;
  ruleActions: Map<string, 'accepted' | 'ignored'>;
  ruleFilter: 'review' | 'all' | 'processed';
  groupMethod: 'position' | 'type';
  searchQuery: string;
  allExpanded: boolean;
  openCat: string | null;
  showBatchConfirm: boolean;
  showHighFailCard: boolean;
  kbEnabled: boolean;
  kbTooltip: boolean;
  effectivePassed: number;
  effectiveWarn: number;
  effectiveIgnored: number;
  effectiveFailed: number;
  warnCount: number;
  warnItems: RuleHitItem[];
  noProfile: boolean;
  schoolLabel: string;
  total: number;
  allProcessed: boolean;
  confirmedRatio: number;
  circumference: number;
  getEffectiveStatus: (rule: RuleHitItem) => string;
  getRuleDesc: (label: string) => { current: string; target: string };
}

interface RulePanelHandlers {
  onRuleClick: (rule: RuleHitItem, cat: string) => void;
  onAcceptRule: (label: string) => void;
  onIgnoreRule: (label: string) => void;
  onResetRule: (label: string) => void;
  onBatchAccept: () => void;
  onCategoryAccept: (items: RuleHitItem[]) => void;
  onExportModList: () => void;
  onDownloadClick: () => void;
  onBack: () => void;
  onSetExpandedWarn: (label: string | null) => void;
  onSetIgnoreInput: (value: string) => void;
  onSetRuleFilter: (filter: 'review' | 'all' | 'processed') => void;
  onSetGroupMethod: (method: 'position' | 'type') => void;
  onSetSearchQuery: (query: string) => void;
  onSetAllExpanded: (expanded: boolean) => void;
  onSetOpenCat: (cat: string | null) => void;
  onSetShowBatchConfirm: (show: boolean) => void;
  onSetShowGuideCard: (show: boolean) => void;
  onSetKbEnabled: (enabled: boolean) => void;
  onSetKbTooltip: (tooltip: boolean) => void;
  onSetActiveRule: (rule: RuleHitItem | null) => void;
  onSetPage: (page: number) => void;
  onSetShowExportConfirm: (show: boolean) => void;
}

interface RulePanelProps {
  data: RulePanelData;
  handlers: RulePanelHandlers;
}

export const RulePanel: React.FC<RulePanelProps> = ({ data, handlers }) => {
  const {
    ruleListRef, activeRuleRef,
    allRules, displayGroups, ruleGroups, activeRule, warnItems,
    effectivePassed, effectiveWarn, effectiveIgnored, effectiveFailed, warnCount,
    noProfile, schoolLabel, total, allProcessed, confirmedRatio, circumference,
    expandedWarn, ignoreInput, ruleActions, ruleFilter, groupMethod,
    searchQuery, allExpanded, openCat, showBatchConfirm, showHighFailCard,
    kbEnabled, kbTooltip, getEffectiveStatus, getRuleDesc,
  } = data;
  const h = handlers;

  // Auto-scroll sidebar to active rule
  React.useEffect(() => {
    if (activeRule && activeRuleRef.current) {
      activeRuleRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeRule]);

  return (
    <aside style={{
      width: 340, flexShrink: 0,
      background: 'var(--paper-0)', borderLeft: '1px solid var(--hair)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--hair)' }}>
        <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 4 }}>
          {noProfile ? '结构检查结果' : '最后确认清单'}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>
          {schoolLabel}{noProfile ? '' : ` · ${total} 条`}
        </div>
      </div>

      {/* P0-1 1-1: Status text line */}
      <div style={{
        margin: '0 18px', padding: '10px 0 8px',
        borderBottom: '1px solid var(--hair)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 4, height: 28, borderRadius: 2, flexShrink: 0,
          background: effectiveWarn > 0 ? 'var(--sun-500)' : 'var(--leaf-500)',
        }} />
        <span style={{
          fontSize: 15, fontWeight: 500, color: 'var(--ink-900)', lineHeight: 1.3,
        }}>
          {effectiveWarn > 0
            ? `还有 ${effectiveWarn} 处变化等你点头确认`
            : `这一轮变化已经确认完成，可以进入导出`}
        </span>
      </div>

      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hair)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <ScoreBlock n={effectivePassed} label="通过" tone="leaf" />
        <ScoreBlock n={effectiveWarn} label="复核" tone="sun" />
        {effectiveIgnored > 0 && <ScoreBlock n={effectiveIgnored} label="忽略" tone="ink" />}
        <ScoreBlock n={effectiveFailed} label="失败" tone={effectiveFailed > 0 ? 'rust' : 'ink'} />
        {/* P0-1 1-1: Ring progress */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="44" height="44" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="18" fill="none" stroke="var(--paper-2)" strokeWidth="4" />
            <circle cx="24" cy="24" r="18" fill="none"
              stroke={allProcessed ? 'var(--leaf-500)' : effectiveWarn > 0 ? 'var(--sun-500)' : 'var(--leaf-500)'}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={allProcessed ? 0 : circumference * (1 - confirmedRatio)}
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dashoffset .3s cubic-bezier(.2,.8,.2,1)' }}
            />
            {allProcessed ? (
              <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
                fill="var(--leaf-500)" fontSize="16" fontWeight="700">✓</text>
            ) : (
              <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
                fill="var(--ink-700)" fontSize="11" fontWeight="600" fontFamily="var(--mono)">
                {Math.round(confirmedRatio * 100)}%
              </text>
            )}
          </svg>
        </div>
        {allProcessed ? (
          <span className="mono" style={{
            fontSize: 10, color: 'var(--leaf-700)',
            background: 'var(--leaf-100)', padding: '2px 8px', borderRadius: 3,
            marginLeft: 4, whiteSpace: 'nowrap',
          }}>
            全部规则已确认
          </span>
        ) : warnCount >= 3 && effectiveWarn > 0 && (
          <>
            <button onClick={() => h.onSetShowBatchConfirm(true)} style={{
              padding: '4px 10px', fontSize: 10.5, border: 'none', borderRadius: 3,
              background: 'var(--brand-700)', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontWeight: 500, whiteSpace: 'nowrap',
              transition: 'transform .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >全部接受</button>
            {showBatchConfirm && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(21,23,27,.35)',
                animation: 'protoFade .15s ease',
              }} onClick={() => h.onSetShowBatchConfirm(false)}>
                <div style={{
                  background: 'var(--paper-0)', borderRadius: 6, padding: '24px 28px',
                  boxShadow: 'var(--shadow-card)', minWidth: 320,
                  animation: 'protoFadeUp .2s ease',
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 8 }}>
                    确定把这 {warnCount} 项变化都标记为“接受”吗？
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 18, lineHeight: 1.5 }}>
                    这是交稿前的批量确认动作，后面仍然可以逐项撤销。
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Btn kind="ghost" size="sm" onClick={() => h.onSetShowBatchConfirm(false)}>取消</Btn>
                    <Btn kind="primary" size="sm" onClick={h.onBatchAccept}>确定接受</Btn>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div ref={ruleListRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {/* P2-2: Filter tabs */}
        <div style={{
          display: 'flex', gap: 2, padding: '6px 14px 4px',
          borderBottom: '1px solid var(--hair)',
        }}>
          {(['review', 'all', 'processed'] as const).map(tab => {
            const labels: Record<string, string> = { review: '需确认', all: '全部', processed: '已处理' };
            const counts: Record<string, number> = {
              review: allRules.filter(r => r.status === 'warn' && !ruleActions.get(r.label)).length,
              all: allRules.length,
              processed: allRules.filter(r => !!ruleActions.get(r.label)).length,
            };
            return (
              <button key={tab} onClick={() => h.onSetRuleFilter(tab)} style={{
                height: 26, padding: '0 10px', border: 'none', borderRadius: 4,
                background: ruleFilter === tab ? 'var(--ink-900)' : 'transparent',
                color: ruleFilter === tab ? '#fff' : 'var(--ink-500)',
                cursor: 'pointer', fontSize: 11, fontWeight: ruleFilter === tab ? 500 : 400,
                fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: 4,
                transition: 'all .1s',
              }}>
                {labels[tab]}
                <span className="mono" style={{ fontSize: 9, opacity: 0.7 }}>({counts[tab]})</span>
              </button>
            );
          })}
          <span style={{ flex: 1 }} />
          {/* P2-3: Group method dropdown */}
          <select value={groupMethod} onChange={e => h.onSetGroupMethod(e.target.value as any)}
            style={{
              height: 22, padding: '0 6px', border: '1px solid var(--hair)', borderRadius: 3,
              fontSize: 10, color: 'var(--ink-500)', background: 'var(--paper-0)',
              fontFamily: 'var(--sans)', cursor: 'pointer',
            }}>
            <option value="position">按位置</option>
            <option value="type">按规则类型</option>
          </select>
        </div>

        {/* P3-4: Search + batch expand/collapse */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderBottom: '1px solid var(--hair)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>🔍</span>
          <input value={searchQuery} onChange={e => h.onSetSearchQuery(e.target.value)}
            placeholder="搜索规则..."
            style={{
              flex: 1, height: 24, border: 'none', background: 'transparent',
              fontSize: 11, color: 'var(--ink-900)', outline: 'none',
              fontFamily: 'var(--sans)',
            }} />
          {searchQuery && (
            <button onClick={() => h.onSetSearchQuery('')} style={{
              background: 'var(--paper-2)', border: 'none', borderRadius: 2,
              padding: '0 6px', height: 18, fontSize: 9, cursor: 'pointer',
              color: 'var(--ink-500)', fontFamily: 'var(--mono)',
            }}>✕</button>
          )}
          <span style={{ width: 1, height: 18, background: 'var(--hair)', margin: '0 4px' }} />
          <button onClick={() => h.onSetAllExpanded(!allExpanded)} style={{
            height: 22, padding: '0 8px', border: '1px solid var(--hair)', borderRadius: 3,
            background: 'transparent', cursor: 'pointer', fontSize: 10,
            color: 'var(--ink-500)', fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
          }}>
            {allExpanded ? '收起全部 ↑' : '展开全部 ↓'}
          </button>
        </div>

        {/* P2-4: High-failure guidance card */}
        {showHighFailCard && (
          <div style={{
            margin: '12px 14px', padding: '16px 18px',
            background: 'var(--paper-1)', borderRadius: 6,
            border: '1px solid var(--hair)', fontSize: 12, lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 6 }}>
              这篇论文和学校模板之间的基础差距还比较大
            </div>
            <div style={{ color: 'var(--ink-500)', marginBottom: 12 }}>
              建议先补齐这些基础结构，再重新上传，会更容易把论文推进到可交付状态：
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {['是否包含标题页（封面）？', '是否包含目录？', '章节标题是否使用了 Word 标题样式？', '参考文献是否使用了自动编号？'].map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ink-700)' }}>
                  <input type="checkbox" defaultChecked={false} style={{ accentColor: 'var(--brand-700)' }} />
                  {item}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => h.onSetShowGuideCard(false)}
                style={{
                  height: 30, padding: '0 14px', border: 'none', borderRadius: 4,
                  background: 'var(--brand-700)', color: '#fff', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--sans)',
                }}>先看详细结果</button>
              <button onClick={h.onBack}
                style={{
                  height: 30, padding: '0 14px', border: '1px solid var(--hair-strong)', borderRadius: 4,
                  background: 'var(--paper-0)', color: 'var(--ink-700)', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'var(--sans)',
                }}>回去重新整理</button>
            </div>
          </div>
        )}

        {/* P3-4: No search results */}
        {!showHighFailCard && total > 0 && searchQuery.trim() && displayGroups.length === 0 && (
          <div style={{
            padding: '30px 20px', textAlign: 'center', fontSize: 12, color: 'var(--ink-500)',
          }}>
            没有搜到相关变化
          </div>
        )}

        {/* P2-4: Empty data state */}
        {!showHighFailCard && total === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 20px', gap: 10, color: 'var(--ink-500)',
            textAlign: 'center', fontSize: 13,
          }}>
            <div style={{ fontSize: 32 }}>📄</div>
            <div style={{ fontWeight: 500, color: 'var(--ink-700)' }}>当前还没有可供确认的规则变化</div>
            <div style={{ fontSize: 12 }}>可能是文档内容过少，或结构信息还不完整。</div>
          </div>
        )}

        {!showHighFailCard && total > 0 && displayGroups.map((g, gi) => {
          const hasReview = g.items.some(r => r.status === 'warn' && !ruleActions.get(r.label));
          const isPurePass = !hasReview && g.items.every(r => r.status === 'pass');
          const open = allExpanded ? true : ruleFilter !== 'all' ? true : isPurePass ? (openCat === `${g.cat}_x`) : (openCat !== `${g.cat}_c`);
          const toggleCat = () => h.onSetOpenCat(open ? `${g.cat}_c` : (isPurePass ? `${g.cat}_x` : g.cat));
          const passes = g.items.filter(r => getEffectiveStatus(r) === 'pass').length;
          const warns = g.items.filter(r => getEffectiveStatus(r) === 'warn').length;
          const fails = g.items.filter(r => getEffectiveStatus(r) === 'fail').length;
          return (
            <div key={gi} style={{ borderBottom: '1px solid var(--hair)' }}>
              <button onClick={toggleCat} style={{
                width: '100%', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
                border: 'none', background: open ? 'var(--paper-1)' : 'transparent', cursor: 'pointer',
                fontFamily: 'var(--sans)',
              }}>
                <span style={{
                  transform: open ? 'rotate(90deg)' : 'rotate(0)',
                  transition: 'transform .15s',
                  color: 'var(--ink-400)', fontFamily: 'var(--mono)', fontSize: 12,
                }}>›</span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: 12.5, color: 'var(--ink-900)', fontWeight: 500 }}>{g.cat}</span>
                {passes > 0 && <span className="chip leaf" style={{ height: 18, fontSize: 10 }}>✓{passes}</span>}
                {warns > 0 && <span className="chip sun" style={{ height: 18, fontSize: 10 }}>⚠{warns}</span>}
                {fails > 0 && <span className="chip rust" style={{ height: 18, fontSize: 10 }}>✗{fails}</span>}
              </button>
              {open && (
                <div style={{ padding: '4px 18px 10px 32px' }}>
                  {/* P2-2: Category-level batch accept */}
                  {hasReview && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); h.onCategoryAccept(g.items); }}
                        style={{
                          height: 22, padding: '0 8px', border: 'none', borderRadius: 3,
                          background: 'var(--brand-50)', color: 'var(--brand-700)',
                          cursor: 'pointer', fontSize: 10, fontWeight: 500,
                          fontFamily: 'var(--sans)',
                        }}>本组全部接受</button>
                    </div>
                  )}
                  {g.items.map((rule, i) => {
                    const isActive = activeRule === rule;
                    const isWarn = rule.status === 'warn';
                    const isFail = rule.status === 'fail';
                    const actionTaken = ruleActions.get(rule.label);
                    const isExpanded = expandedWarn === rule.label;
                    const desc = getRuleDesc(rule.label);
                    return (
                      <div key={i}>
                        <button ref={isActive ? activeRuleRef : undefined}
                          onClick={() => {
                            h.onRuleClick(rule, g.cat);
                            if (isWarn) h.onSetExpandedWarn(isExpanded ? null : rule.label);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12,
                            width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
                            textAlign: 'left', borderLeft: isActive ? '3px solid var(--brand-700)' : '3px solid transparent',
                            paddingLeft: isActive ? 5 : 8,
                            borderRadius: 0, opacity: actionTaken ? 0.55 : 1,
                            textDecoration: actionTaken === 'ignored' ? 'line-through' : 'none',
                            transition: 'border-color .15s, background .15s',
                          }}>
                          <span style={{
                            width: 12, height: 12, borderRadius: 6, flex: '0 0 auto',
                            background: actionTaken === 'accepted' ? 'var(--leaf-100)' : actionTaken === 'ignored' ? 'var(--paper-2)' : isFail ? 'var(--rust-100)' : isWarn ? 'var(--sun-100)' : 'var(--leaf-100)',
                            color: actionTaken === 'accepted' ? 'var(--leaf-700)' : actionTaken === 'ignored' ? 'var(--ink-400)' : isFail ? 'var(--rust-700)' : isWarn ? 'var(--sun-700)' : 'var(--leaf-700)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 700,
                          }}>{actionTaken === 'accepted' ? '✓' : actionTaken === 'ignored' ? '–' : isFail ? '✗' : isWarn ? '!' : '✓'}</span>
                          <span style={{
                            flex: 1,
                            color: actionTaken ? 'var(--ink-400)' : isFail ? 'var(--rust-700)' : isWarn ? 'var(--sun-700)' : 'var(--ink-700)',
                          }}>{rule.label}</span>
                          {rule.location?.pageIndex != null && (
                            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-400)' }}>
                              P{rule.location.pageIndex + 1}
                            </span>
                          )}
                        </button>

                        {isWarn && isExpanded && (
                          <div style={{
                            margin: '6px 0 8px', padding: '10px 12px',
                            background: 'var(--paper-1)', borderRadius: 4,
                            border: '1px solid var(--hair)',
                            animation: 'protoFade .15s ease',
                          }}>
                            {desc && (
                              <div style={{ fontSize: 10.5, lineHeight: 1.5, marginBottom: 10, color: 'var(--ink-700)' }}>
                                <div><span className="mono" style={{ color: 'var(--ink-400)' }}>当前</span> {desc.current}</div>
                                <div><span className="mono" style={{ color: 'var(--leaf-500)' }}>目标</span> {desc.target}</div>
                              </div>
                            )}

                            {actionTaken ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>
                                  {actionTaken === 'accepted' ? '✓ 已接受修改' : '– 已忽略'}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); h.onResetRule(rule.label); }}
                                  style={{
                                    padding: '2px 8px', fontSize: 10, border: 'none', borderRadius: 3,
                                    background: 'transparent', color: 'var(--ink-500)',
                                    cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '.04em',
                                    textDecoration: 'underline', textUnderlineOffset: 2,
                                  }}>↩ 撤销</button>
                                <button onClick={(e) => { e.stopPropagation(); h.onResetRule(rule.label); }}
                                  style={{
                                    padding: '2px 8px', fontSize: 10, border: '1px solid var(--hair-strong)', borderRadius: 3,
                                    background: 'transparent', color: 'var(--ink-500)',
                                    cursor: 'pointer', fontFamily: 'var(--sans)',
                                  }}>↩ 恢复待确认</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button onClick={(e) => { e.stopPropagation(); h.onAcceptRule(rule.label); }}
                                  style={{
                                    padding: '4px 10px', fontSize: 10.5, border: 'none', borderRadius: 3,
                                    background: 'var(--leaf-100)', color: 'var(--leaf-700)', cursor: 'pointer',
                                    fontFamily: 'var(--sans)', fontWeight: 500, transition: 'transform .15s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                >✓ 接受这处变化</button>

                                {ignoreInput && expandedWarn === rule.label ? (
                                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input autoFocus value={ignoreInput} onChange={e => h.onSetIgnoreInput(e.target.value)}
                                      placeholder="填写忽略原因…"
                                      style={{
                                        width: 100, fontSize: 10, padding: '3px 6px',
                                        border: '1px solid var(--hair-strong)', borderRadius: 3,
                                        fontFamily: 'var(--sans)',
                                      }} />
                                    <button onClick={(e) => { e.stopPropagation(); h.onIgnoreRule(rule.label); }}
                                      style={{
                                        padding: '4px 8px', fontSize: 10, border: 'none', borderRadius: 3,
                                        background: 'var(--ink-900)', color: '#fff', cursor: 'pointer',
                                      }}>确认</button>
                                  </div>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); h.onSetIgnoreInput(' '); setTimeout(() => h.onSetIgnoreInput(''), 10); }}
                                    style={{
                                      padding: '4px 10px', fontSize: 10.5, border: '1px solid var(--hair-strong)', borderRadius: 3,
                                      background: 'transparent', color: 'var(--ink-500)', cursor: 'pointer',
                                      fontFamily: 'var(--sans)', transition: 'transform .15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                  >✕ 先忽略这处</button>
                                )}

                                <button onClick={(e) => { e.stopPropagation(); h.onRuleClick(rule, g.cat); }}
                                  style={{
                                    padding: '4px 10px', fontSize: 10.5, border: '1px solid var(--hair-strong)', borderRadius: 3,
                                    background: 'transparent', color: 'var(--ink-500)', cursor: 'pointer',
                                    fontFamily: 'var(--sans)', transition: 'transform .15s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                >✎ 去纸面里查看</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* P5-4: Quick nav — next review item */}
      <div style={{
        padding: '10px 14px', borderTop: '1px solid var(--hair)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {warnItems.length > 0 ? (
          <button onClick={() => {
            const currentIdx = warnItems.findIndex(r => r.label === expandedWarn);
            const nextIdx = currentIdx < warnItems.length - 1 ? currentIdx + 1 : 0;
            const next = warnItems[nextIdx];
            if (next) {
              h.onSetExpandedWarn(next.label);
              h.onSetActiveRule(next);
              for (const g of ruleGroups) {
                if (g.items.some(r => r.label === next.label)) {
                  h.onSetOpenCat(g.cat);
                  break;
                }
              }
              if (next.location?.pageIndex != null) h.onSetPage(next.location.pageIndex + 1);
            }
          }}
            style={{
              flex: 1, height: 32, padding: '0 12px', border: '1px solid var(--hair-strong)',
              borderRadius: 4, background: 'var(--paper-0)', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--ink-700)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span>⏎ 继续确认下一处</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>
              {warnItems.findIndex(r => r.label === expandedWarn) + 1}/{warnItems.length}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 14 }}>→</span>
          </button>
        ) : effectivePassed > 0 && (
          <button onClick={() => h.onSetShowExportConfirm(true)} style={{
            flex: 1, height: 32, padding: '0 12px', border: '1px solid var(--leaf-500)',
            borderRadius: 4, background: 'var(--leaf-100)', cursor: 'pointer',
            fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--leaf-700)',
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
          }}>
            <span>✅ 全部已确认</span>
            <span style={{ flex: 1 }} />
            <span>[ 进入交稿导出 → ]</span>
          </button>
        )}
        {/* P2 5-4: Keyboard shortcuts toggle */}
        <div style={{ position: 'relative' }}
          onMouseEnter={() => h.onSetKbTooltip(true)}
          onMouseLeave={() => h.onSetKbTooltip(false)}>
          <button onClick={() => h.onSetKbEnabled(!kbEnabled)} style={{
            width: 28, height: 28, borderRadius: 4, border: `1px solid ${kbEnabled ? 'var(--brand-700)' : 'var(--hair-strong)'}`,
            background: kbEnabled ? 'var(--brand-50)' : 'transparent',
            color: kbEnabled ? 'var(--brand-700)' : 'var(--ink-400)',
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)',
          }} title={kbEnabled ? '关闭快捷键' : '开启快捷键'}>⌨</button>
          {kbTooltip && (
            <div style={{
              position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
              background: 'var(--ink-900)', color: 'var(--paper-0)',
              padding: '8px 12px', borderRadius: 4, fontSize: 10.5, lineHeight: 1.7,
              fontFamily: 'var(--mono)', boxShadow: '0 4px 12px rgba(0,0,0,.25)',
              whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none',
            }}>
              {kbEnabled ? '快捷键已启用' : '点击启用快捷键'}
              <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', margin: '4px 0', paddingTop: 4 }}>
                J 下一个待确认 · K 上一个<br/>
                A 接受当前项 · I 忽略当前项<br/>
                Z 撤销当前项
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--hair)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn kind="ghost" size="sm" onClick={h.onBack}>返回修改</Btn>
        {noProfile ? (
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-400)', alignSelf: 'center' }}>
            未选择规范 · 格式不修改
          </span>
        ) : (
          <>
            {warnItems.length === 0 && effectivePassed > 0 && (
              <span style={{ fontSize: 11, color: 'var(--leaf-700)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                ✅ 全部已确认
              </span>
            )}
            <span style={{ flex: 1 }} />
            <Btn kind="ghost" size="sm" icon="download" onClick={h.onExportModList}>
              导出这次修改清单
            </Btn>
            <Btn kind="primary" size="sm" icon="download" onClick={h.onDownloadClick}>
              进入交稿导出
            </Btn>
          </>
        )}
      </div>
    </aside>
  );
};
