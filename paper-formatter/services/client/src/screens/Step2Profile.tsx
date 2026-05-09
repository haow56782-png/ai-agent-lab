import RulesModal from '../components/RulesModal';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon, Btn } from '../components/Common';
import {
  useApp,
  getSchoolOptions,
  findSchoolById,
  upsertLearnedSchool,
  defaultBaseStandardVersion,
  type SchoolOption,
  type BaseStandardVersion,
} from '../components/AppFrame';
import { api } from '../api/client';
import { RULE_COUNT } from '../constants/rules';

interface Props {
  showToast: (msg: string) => void;
}

const BASE_STANDARD_OPTIONS: Array<{
  id: BaseStandardVersion;
  label: string;
  short: string;
  note: string;
}> = [
  { id: 'GB/T 7713.1-2006', label: 'GB/T 7713.1-2006', short: '2006 基线', note: '适用于 2026-02-01 前已执行的旧版规范包' },
  { id: 'GB/T 7713.1-2025', label: 'GB/T 7713.1-2025', short: '2025 基线', note: '自 2026-02-01 起默认启用的新国标基线' },
];

function inferSchoolMeta(filename: string): { name: string; faculty: string } {
  const base = filename.replace(/\.(docx|pdf)$/i, '').trim();
  const schoolMatch = base.match(/([\u4e00-\u9fa5A-Za-z]{2,}(?:大学|学院|学校))/);
  const schoolName = schoolMatch?.[1] || base.split(/[·•_\-\s]/)[0] || base;
  const facultyMatch = base.match(/(?:大学|学院|学校)[·•_\-\s]*([\u4e00-\u9fa5A-Za-z0-9]{2,}(?:学院|系|专业|研究院|中心)?)/);
  return {
    name: schoolName,
    faculty: facultyMatch?.[1] || '上传范文模板',
  };
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return '未标注';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const Field: React.FC<{ label: string; value: string; arrow?: boolean; accent?: boolean }> = ({ label, value, arrow, accent }) => (
  <div style={{
    border: `1px solid ${accent ? 'var(--sun-500)' : 'var(--hair-strong)'}`,
    borderRadius: 4,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    background: accent ? 'var(--sun-100)' : 'var(--paper-0)',
    cursor: 'pointer',
  }}>
    <div style={{ fontSize: 10, color: accent ? 'var(--sun-700)' : 'var(--ink-500)', letterSpacing: '.04em' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{value}</div>
      {arrow && <Icon name="chevron" size={12} color="var(--ink-400)" />}
    </div>
  </div>
);

const Step2Profile: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const [q, setQ] = useState('');
  const templateInputRef = useRef<HTMLInputElement>(null);
  const [schoolOptions, setSchoolOptions] = useState(() => getSchoolOptions());
  const selected = findSchoolById(state.schoolId);
  const [showRules, setShowRules] = useState(false);
  const [uploadCountMap, setUploadCountMap] = useState<Record<string, number>>({});
  const [extraSchools, setExtraSchools] = useState<SchoolOption[]>([]);
  const [baseStandard, setBaseStandard] = useState<BaseStandardVersion>(defaultBaseStandardVersion());
  const allOptions = React.useMemo(() => [...schoolOptions, ...extraSchools], [schoolOptions, extraSchools]);
  const filtered = allOptions.filter(s =>
    (s.baseStandardVersion || 'GB/T 7713.1-2006') === baseStandard &&
    (!q || s.name.includes(q) || s.faculty.includes(q))
  );

  const startParse = () => {
    if (!state.doc) { showToast('请先上传论文文档'); return; }
    set({ step: 3, parsePct: 0, parsePhase: 0, parseDone: false });
  };

  const handleTemplate = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'docx' && ext !== 'pdf') {
      showToast('仅支持 .docx 或 .pdf 格式手册');
      return;
    }
    showToast('正在解析模板…');
    try {
      const result = await api.importTemplate(file);
      const rules = result.ruleCount || 65;
      const inferred = inferSchoolMeta(file.name);
      const learnedSchool = upsertLearnedSchool({
        name: inferred.name,
        faculty: inferred.faculty,
        rules,
        baseStandardVersion: baseStandard,
      });
      const existsBefore = schoolOptions.some(item => item.id === learnedSchool.id);
      setSchoolOptions(getSchoolOptions());
      set({
        schoolId: learnedSchool.id,
        draftSchool: {
          id: learnedSchool.id,
          name: learnedSchool.name,
          faculty: learnedSchool.faculty,
          rules: learnedSchool.rules,
          match: learnedSchool.match,
          baseStandardVersion: learnedSchool.baseStandardVersion,
        },
      });
      showToast(
        existsBefore
          ? `${learnedSchool.name} 规则覆盖已补充到 ${learnedSchool.match}%`
          : `已自动加入学校列表 · ${learnedSchool.name} · 覆盖 ${learnedSchool.match}%`
      );
    } catch (err: any) {
      showToast(`模板解析失败: ${err.message}`);
    }
  }, [baseStandard, schoolOptions, set, showToast]);

  const onTemplateFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleTemplate(files[0]);
    e.target.value = '';
  }, [handleTemplate]);

  const useDraftProfile = useCallback(() => {
    const name = state.draftSchool?.name || '自定义';
    const draftId = state.draftSchool?.id || 'draft';
    setSchoolOptions(getSchoolOptions());
    set({ schoolId: draftId, draftSchool: null });
    showToast(`已选用 · ${name} 规则包`);
  }, [state.draftSchool]);

  useEffect(() => {
    if (!state.docId) return;
    const docId: string = state.docId;

    let cancelled = false;

    const run = async () => {
      set({ detecting: true });
      try {
        const [detectResult, profileResult] = await Promise.all([
          api.detectSchool(docId),
          api.listProfiles(),
        ]);
        if (cancelled) return;

        const ucMap: Record<string, number> = {};
        const extras: SchoolOption[] = [];
        const localIds = new Set(getSchoolOptions().map(o => o.id));
        const accentColors = ['var(--brand-700)', 'var(--rust-500)', 'var(--leaf-500)', 'var(--sun-500)', 'var(--brand-500)', 'var(--ink-700)'];

        for (let i = 0; i < profileResult.profiles.length; i++) {
          const p = profileResult.profiles[i];
          ucMap[p.schoolId] = p.uploadCount;
          if (!localIds.has(p.schoolId)) {
            extras.push({
              id: p.schoolId,
              name: p.name,
              faculty: p.faculty || '',
              match: Math.min(100, 60 + Math.round(p.ruleCount / 4)),
              rules: p.ruleCount,
              version: p.version,
              initial: p.name.trim().slice(0, 1) || '校',
              accent: accentColors[extras.length % 6],
              baseStandardVersion: 'GB/T 7713.1-2006' as const,
              sourceType: 'learned',
              uploadCount: p.uploadCount,
            });
          }
        }
        setUploadCountMap(ucMap);
        setExtraSchools(extras);

        let synced = false;
        for (const p of profileResult.profiles) {
          if (p.ruleCount > 0) {
            const local = findSchoolById(p.schoolId);
            if (local && local.rules < p.ruleCount) {
              upsertLearnedSchool({
                name: p.name, faculty: p.faculty, rules: p.ruleCount, id: p.schoolId,
                baseStandardVersion: baseStandard,
              });
              synced = true;
            }
          }
        }
        if (synced) {
          setSchoolOptions(getSchoolOptions());
        }

        if (detectResult.detected && detectResult.name) {
          set({
            detectedSchool: {
              name: detectResult.name,
              confidence: detectResult.confidence,
              isNew: !detectResult.existingSchoolId,
              existingSchoolId: detectResult.existingSchoolId,
            },
          });

          if (detectResult.existingSchoolId) {
            const known = findSchoolById(detectResult.existingSchoolId);
            set({ schoolId: detectResult.existingSchoolId });
            showToast(`检测到 ${known?.name || detectResult.name}，已自动选择`);
          }
        }
      } catch (err) {
        if (!cancelled) console.warn('detect failed:', err);
      } finally {
        if (!cancelled) set({ detecting: false });
      }
    };

    run();
    return () => { cancelled = true; };
  }, [state.docId]);

  useEffect(() => {
    if (!state.docId) return;
    let cancelled = false;
    api.listProfiles().then(result => {
      if (cancelled) return;
      const ucMap: Record<string, number> = {};
      let synced = false;
      for (const p of result.profiles) {
        ucMap[p.schoolId] = p.uploadCount;
        if (p.ruleCount > 0) {
          const local = findSchoolById(p.schoolId);
          if (local && local.rules < p.ruleCount) {
            upsertLearnedSchool({
              name: p.name, faculty: p.faculty, rules: p.ruleCount, id: p.schoolId,
              baseStandardVersion: baseStandard,
            });
            synced = true;
          }
        }
      }
      setUploadCountMap(ucMap);
      if (synced) {
        setSchoolOptions(getSchoolOptions());
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [state.schoolId, state.docId]);

  const handleAutoCreate = async () => {
    if (!state.detectedSchool || !state.docId) return;
    try {
      const result = await api.autoCreateSchool(state.detectedSchool.name, state.docId);
      upsertLearnedSchool({
        name: state.detectedSchool.name,
        faculty: '',
        rules: RULE_COUNT,
        id: result.schoolId,
        baseStandardVersion: baseStandard,
      });
      setSchoolOptions(getSchoolOptions());
      setExtraSchools(prev => prev.filter(s => s.id !== result.schoolId));
      set({ schoolId: result.schoolId, detectedSchool: null });
      showToast(`已添加学校 · ${state.detectedSchool.name}`);
    } catch (err: any) {
      showToast(`自动添加失败: ${err.message}`);
    }
  };

  return (
    <div style={{ flex: 1, padding: '28px 56px', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 32 }}>
      <input
        ref={templateInputRef}
        type="file"
        accept=".docx,.pdf"
        onChange={onTemplateFileChange}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="secdex" style={{ marginBottom: 10 }}>第二步 · SCHOOL PROFILE</div>
        <h2 className="serif" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.4 }}>
          选择学校规范
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '0 0 18px', maxWidth: 520 }}>
          学校 / 学院 / 专业三级规则包，版本化管理。未覆盖的院校可上传模板自动反推 profile。
        </p>
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 4,
          background: 'var(--paper-0)', border: '1px solid var(--hair)',
          fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55,
        }}>
          <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>规则分层：</span>
          <span>先确定国家标准基线（如 `GB/T 7713.1-2006` 或 `GB/T 7713.1-2025`），再在其上选择学校/学院规则包。</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {BASE_STANDARD_OPTIONS.map(option => {
            const active = baseStandard === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setBaseStandard(option.id)}
                style={{
                  flex: 1,
                  borderRadius: 6,
                  border: `1px solid ${active ? 'var(--brand-700)' : 'var(--hair-strong)'}`,
                  background: active ? 'var(--brand-50)' : 'var(--paper-0)',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--brand-700)' : 'var(--ink-900)' }}>{option.short}</div>
                  {active && <span className="chip brand">当前</span>}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginBottom: 4 }}>{option.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.45 }}>{option.note}</div>
              </button>
            );
          })}
        </div>

        {state.detecting && (
          <div style={{
            padding: '10px 14px', background: 'var(--brand-50)',
            border: '1px solid var(--brand-200)', borderRadius: 4, marginBottom: 12,
            fontSize: 13, color: 'var(--brand-700)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: 6,
              border: '2px solid var(--brand-300)',
              borderTopColor: 'transparent',
              animation: 'spin .6s linear infinite',
              display: 'inline-block',
            }} />
            正在检测论文来源学校…
          </div>
        )}
        {state.detectedSchool && !state.detectedSchool.existingSchoolId && (
          <div style={{
            padding: '12px 16px', background: 'var(--sun-100)',
            border: '1px solid var(--sun-300)', borderRadius: 4, marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sun-700)', marginBottom: 2 }}>
              检测到新学校: {state.detectedSchool.name}
              <span className="mono" style={{ fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                置信度 {(state.detectedSchool.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--sun-600)', marginBottom: 8 }}>
              未收录此学校 · 自动添加后即可使用规则检测
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn kind="primary" size="sm" onClick={handleAutoCreate}>自动添加</Btn>
              <Btn kind="ghost" size="sm" onClick={() => set({ detectedSchool: null })}>忽略</Btn>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--paper-0)', border: '1px solid var(--hair-strong)',
          borderRadius: 4, padding: '0 14px', height: 40, marginBottom: 12,
        }}>
          <Icon name="search" size={15} color="var(--ink-400)" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="搜索学校 · 学院 · 专业"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, fontFamily: 'var(--sans)', color: 'var(--ink-900)',
            }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>{filtered.length} / {allOptions.length} 所</span>
        </div>

        <div style={{
          background: 'var(--paper-0)', border: '1px solid var(--hair)',
          borderRadius: 4, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column',
        }}>
          {filtered.map((s, i) => {
            const sel = state.schoolId === s.id;
            return (
              <button key={s.id} onClick={() => { set({ schoolId: s.id, draftSchool: null }); showToast(`已选 ${s.name} · ${s.faculty}`); }} style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                borderBottom: i < filtered.length - 1 ? '1px solid var(--hair)' : 'none',
                background: sel ? 'var(--brand-50)' : 'transparent',
                position: 'relative', textAlign: 'left',
                border: 'none', borderBottomColor: i < filtered.length - 1 ? 'var(--hair)' : 'transparent',
                borderBottomStyle: 'solid', borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                cursor: 'pointer', fontFamily: 'var(--sans)',
                transition: 'background .15s',
              }}>
                {sel && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--brand-700)' }} />}
                <div style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: sel ? 'var(--brand-700)' : 'var(--paper-2)',
                  color: sel ? 'var(--paper-0)' : 'var(--ink-700)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600,
                  transition: 'all .15s',
                }}>{s.initial}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{s.faculty}</div>
                  {(uploadCountMap[s.id] || 0) > 0 && (
                    <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 1, letterSpacing: '.02em' }}>
                      {uploadCountMap[s.id]} 篇已上传
                    </div>
                  )}
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 3 }}>
                    {s.baseStandardVersion || 'GB/T 7713.1-2006'} · {s.sourceType === 'learned' ? '自动学习' : '官方规则'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', position: 'relative' }}>
                  <div className="mono num" style={{ fontSize: 13, fontWeight: 600, color: s.match === 100 ? 'var(--leaf-700)' : 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>{s.match}%
                    <span style={{
                      display: 'inline-flex', width: 14, height: 14, borderRadius: 7,
                      background: 'var(--paper-2)', color: 'var(--ink-500)',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 600, cursor: 'pointer', position: 'relative',
                    }}
                      onMouseEnter={e => {
                        const tip = document.createElement('div');
                        tip.id = 'match-tip';
                        tip.textContent = `匹配度基于你文档的标题页结构、摘要格式、参考文献样式等特征自动计算。${s.match}% 表示高度匹配，建议选择此规范。`;
                        tip.style.cssText = 'position:fixed;background:var(--ink-900);color:var(--paper-0);padding:6px 10px;border-radius:4px;font-size:10.5;line-height:1.4;font-family:var(--sans);white-space:nowrap;z-index:1000;pointer-events:none;';
                        const r = e.currentTarget.getBoundingClientRect();
                        tip.style.left = (r.left - 80) + 'px';
                        tip.style.top = (r.bottom + 6) + 'px';
                        document.body.appendChild(tip);
                      }}
                      onMouseLeave={() => { const t = document.getElementById('match-tip'); if (t) t.remove(); }}
                    >ⓘ</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.04em' }}>规则覆盖</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {s.sourceType === 'learned' ? <span className="chip sun">学习规则</span> : <span className="chip leaf">官方规则</span>}
                  {s.effectiveFrom && <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)' }}>{fmtDate(s.effectiveFrom)}</span>}
                </div>
                {sel && <Icon name="check" size={16} color="var(--brand-700)" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
              没有匹配的学校。试试上传一份模板？
            </div>
          )}
        </div>

        <div style={{
          marginTop: 12, padding: '14px 16px',
          border: '1.2px dashed var(--ink-300)', borderRadius: 4,
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }} onClick={() => templateInputRef.current?.click()}>
          <Icon name="upload" size={16} color="var(--ink-500)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 500 }}>未找到我的学校？</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>上传学校格式手册或一份范文，自动反推规则包</div>
          </div>
          <Btn kind="ghost" size="sm" onClick={() => templateInputRef.current?.click()}>上传模板</Btn>
        </div>
      </div>

      <div style={{
        background: 'var(--paper-0)', borderRadius: 6,
        border: '1px solid var(--hair)', padding: '20px 22px 0',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        {state.draftSchool ? (
          <DraftProfile draft={state.draftSchool} onUse={useDraftProfile} />
        ) : state.schoolId === 'draft' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--brand-700)', color: 'var(--paper-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>范</div>
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>自定义模板 · 范文反推</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4 }}>draft profile · 规则待完善</div>
              </div>
              <span className="chip leaf">已选用</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
              规则包信息可后续在规范管理中完善
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              padding: '14px 0', borderTop: '1px solid var(--hair)',
            }}>
              <Btn kind="primary" icon="sparkle" onClick={startParse}>开始解析</Btn>
            </div>
          </div>
        ) : !selected ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-400)', textAlign: 'center', padding: '40px 24px', gap: 8,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36,
              background: 'var(--paper-2)', color: 'var(--ink-400)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
            }}>
              <Icon name="book" size={28} />
            </div>
            <div className="serif" style={{ fontSize: 18, color: 'var(--ink-700)', marginBottom: 4 }}>选一所学校查看规则细节</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)', maxWidth: 280, marginBottom: 12 }}>
              页面 · 字号 · 标题 · 题注 · 页码 · 参考文献
            </div>
            <div style={{ width: '100%', borderTop: '1px solid var(--hair)', margin: '8px 0', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}>或跳过规范选择：</div>
              <Btn kind="ghost" icon="eye" onClick={() => { set({ step: 3, parsePct: 0, parsePhase: 0, parseDone: false }); showToast('浏览模式 · 仅查看文档结构，不修改格式'); }}
                style={{ border: '1px solid var(--paper-3)', opacity: 0.8 }}>
                浏览模式 · 仅查看文档结构
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22, background: selected.accent,
                color: 'var(--paper-0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600,
              }}>{selected.initial}</div>
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>
                  {selected.name} · {selected.faculty}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4, letterSpacing: '.04em' }}>
                  profile · {selected.version} · 生效 {fmtDate(selected.effectiveFrom)} · {selected.rules} 条规则
                </div>
              </div>
              <span className="chip leaf">已选用</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <Field label="规则版本" value={`${selected.version} (现行)`} arrow />
              <Field label="国家标准基线" value={selected.baseStandardVersion || 'GB/T 7713.1-2006'} arrow accent />
            </div>
            <div style={{
              padding: '10px 12px', background: 'var(--brand-50)', borderRadius: 4,
              fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.55, marginBottom: 14,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--brand-700)' }}>区分逻辑：</span>
              <span>所选规则包叠加国标基线生效。同一基线内的规则自动合并应用，不同基线互不干扰。</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <Field label="规则来源" value={selected.sourceType === 'learned' ? '自动学习' : '官方规则'} />
              <Field label="生效日期" value={fmtDate(selected.effectiveFrom)} />
              <Field label="覆盖度" value={`${selected.match}%`} />
            </div>

            <div className="hrule" />

            <div style={{ flex: 1, overflow: 'auto', paddingTop: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>规则速览</div>
              {[
                ['A. 页面基础', 'A4 · 上 25 / 下 25 / 左 30 / 右 25 mm · 装订线 0'],
                ['I. 正文段落', '宋体 / Times New Roman · 小四 · 1.5 倍行距 · 首行 2 字符'],
                ['H. 章节标题', '黑体 · 三号 · 段前 24 段后 18 · 居中'],
                ['M. 图片 / L. 表格', '图题宋体五号置图下 · 三线表 · 章号编号'],
                ['E. / F. 摘要', '中英文摘要独立分节 · 罗马数字页码'],
                ['J. 页眉页码', '阿拉伯数字 · 1 起 · 页脚居中 · 章眉'],
                ['O. 参考文献', 'GB/T 7714-2015 · 顺序编码制 · 悬挂缩进'],
              ].map(([k, v], i, a) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12,
                  padding: '8px 0', borderBottom: i < a.length - 1 ? '1px dashed var(--hair)' : 'none',
                  fontSize: 12, alignItems: 'baseline',
                }}>
                  <div className="mono" style={{ color: 'var(--ink-500)', fontSize: 11, letterSpacing: '.02em' }}>{k}</div>
                  <div style={{ color: 'var(--ink-700)' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0', borderTop: '1px solid var(--hair)',
            }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>预计 {selected.rules} 项规则将应用</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn kind="ghost" onClick={() => setShowRules(true)}>查看完整规则</Btn>
                <Btn kind="primary" icon="sparkle" onClick={startParse}>开始解析</Btn>
              </div>
            </div>
          </>
        )}
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} school={selected} />}
    </div>
  );
};

const DraftProfile: React.FC<{ draft: { id: string; name: string; faculty: string; rules: number; match: number; baseStandardVersion?: 'GB/T 7713.1-2006' | 'GB/T 7713.1-2025' }; onUse: () => void }> = ({ draft, onUse }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 0' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22,
        background: 'var(--brand-700)', color: 'var(--paper-0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600,
      }}>范</div>
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>
          {draft.name} · {draft.faculty}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4, letterSpacing: '.04em' }}>
          draft profile · 由上传范文自动反推 · {draft.rules} 条规则 · 覆盖 {draft.match}%
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 3 }}>
          国标基线 · {draft.baseStandardVersion || 'GB/T 7713.1-2006'}
        </div>
      </div>
      <span className="chip sun">待确认</span>
    </div>
    <div style={{ padding: '12px 14px', background: 'var(--sun-100)', borderRadius: 4, marginBottom: 16, fontSize: 12, color: 'var(--sun-700)' }}>
      <strong>规则包为自动反推</strong>，建议逐条确认。可通过上传更完整的格式手册（.docx）提升覆盖度。
    </div>
    <div className="hrule" />
    <div style={{ flex: 1, overflow: 'auto', paddingTop: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>规则速览（预估）</div>
      {[
        ['A. 页面基础', 'A4 · 上 25 / 下 25 / 左 30 / 右 25 mm'],
        ['I. 正文段落', '宋体 · 小四 · 1.5 倍行距 · 首行缩进 2 字符'],
        ['H. 章节标题', '黑体 · 三号（一级）· 居中 · 段前 24 段后 18'],
        ['L. 表格 / M. 图片', '三线表 · 宋体五号 · 题注章节编号'],
        ['O. 参考文献', 'GB/T 7714-2015 · 顺序编码制'],
      ].map(([k, v], i, a) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12,
          padding: '8px 0', borderBottom: i < a.length - 1 ? '1px dashed var(--hair)' : 'none',
          fontSize: 12, alignItems: 'baseline',
        }}>
          <div className="mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>{k}</div>
          <div style={{ color: 'var(--ink-700)' }}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{
      display: 'flex', justifyContent: 'flex-end', gap: 8,
      padding: '14px 0', borderTop: '1px solid var(--hair)',
    }}>
      <Btn kind="primary" onClick={onUse}>使用此规则包</Btn>
    </div>
  </div>
);

export default Step2Profile;
