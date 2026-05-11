import RulesModal from '../components/RulesModal';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon, Btn } from '../components/Common';
import { DraftProfileCard } from '../components/DraftProfileCard';
import { ProfileSelectionPanel } from '../components/ProfileSelectionPanel';
import { SelectedProfileSummary } from '../components/SelectedProfileSummary';
import {
  useApp,
  getLegacyDocumentId,
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

const Step2Profile: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const legacyDocId = getLegacyDocumentId(state);
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
    if (!legacyDocId) return;
    const docId: string = legacyDocId;

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
  }, [baseStandard, legacyDocId, set, showToast]);

  useEffect(() => {
    if (!legacyDocId) return;
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
  }, [baseStandard, legacyDocId, state.schoolId]);

  const handleAutoCreate = async () => {
    if (!state.detectedSchool || !legacyDocId) return;
    try {
      const result = await api.autoCreateSchool(state.detectedSchool.name, legacyDocId);
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

      <ProfileSelectionPanel
        query={q}
        baseStandard={baseStandard}
        filtered={filtered}
        allOptionsCount={allOptions.length}
        uploadCountMap={uploadCountMap}
        detecting={state.detecting}
        detectedSchool={state.detectedSchool}
        selectedSchoolId={state.schoolId}
        onQueryChange={setQ}
        onBaseStandardChange={setBaseStandard}
        onSelectSchool={(school) => {
          set({ schoolId: school.id, draftSchool: null });
          showToast(`已选定 ${school.name} · ${school.faculty}，接下来会按这套规范处理论文`);
        }}
        onAutoCreateSchool={handleAutoCreate}
        onDismissDetectedSchool={() => set({ detectedSchool: null })}
        onOpenTemplateUpload={() => templateInputRef.current?.click()}
        formatDate={fmtDate}
      />

      <div style={{
        background: 'var(--paper-0)', borderRadius: 6,
        border: '1px solid var(--hair)', padding: '20px 22px 0',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        {state.draftSchool ? (
          <DraftProfileCard draft={state.draftSchool} onUse={useDraftProfile} />
        ) : state.schoolId === 'draft' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--brand-700)', color: 'var(--paper-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>范</div>
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>自定义模板 · 范文反推</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4 }}>draft profile · 先跑通，再逐步补强</div>
              </div>
              <span className="chip leaf">已选定</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
              这套规则还可以后续继续补全，但已经足够先把论文往正确方向推进
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              padding: '14px 0', borderTop: '1px solid var(--hair)',
            }}>
              <Btn kind="primary" icon="sparkle" onClick={startParse}>继续解析这篇论文</Btn>
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
            <div className="serif" style={{ fontSize: 18, color: 'var(--ink-700)', marginBottom: 4 }}>先选一套规范，再往下走</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)', maxWidth: 280, marginBottom: 12 }}>
              页面、字号、标题、页码、参考文献这些关键细节，都会从这里开始定准
            </div>
            <div style={{ width: '100%', borderTop: '1px solid var(--hair)', margin: '8px 0', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}>如果你现在只想先看结构，也可以：</div>
              <Btn kind="ghost" icon="eye" onClick={() => { set({ step: 3, parsePct: 0, parsePhase: 0, parseDone: false }); showToast('浏览模式 · 仅查看文档结构，不修改格式'); }}
                style={{ border: '1px solid var(--paper-3)', opacity: 0.8 }}>
                先进入浏览模式
              </Btn>
            </div>
          </div>
        ) : (
          <SelectedProfileSummary
            profile={selected}
            effectiveFromLabel={fmtDate(selected.effectiveFrom)}
            onShowRules={() => setShowRules(true)}
            onStartParse={startParse}
          />
        )}
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} school={selected} />}
    </div>
  );
};

export default Step2Profile;
