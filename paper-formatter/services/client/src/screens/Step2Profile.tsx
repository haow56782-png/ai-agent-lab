import RulesModal from '../components/RulesModal';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon, Btn } from '../components/Common';
import { DraftProfileCard } from '../components/DraftProfileCard';
import { ProfileSelectionPanel } from '../components/ProfileSelectionPanel';
import { SelectedProfileSummary } from '../components/SelectedProfileSummary';
import { getProfileRuleStatus, type RuleStatusFilter } from '../components/profileSourceMeta';
import {
  useApp,
  getLegacyDocumentId,
  defaultBaseStandardVersion,
  getSchoolOptions,
  type SchoolOption,
  type BaseStandardVersion,
} from '../components/AppFrame';
import { api, type SchoolProfile } from '../api/client';

interface Props {
  showToast: (msg: string) => void;
}

type ProfileCatalogItem = Awaited<ReturnType<typeof api.listProfiles>>['profiles'][number];

const PROFILE_ACCENTS = [
  'var(--brand-700)',
  'var(--rust-500)',
  'var(--leaf-500)',
  'var(--sun-500)',
  'var(--brand-500)',
  'var(--ink-700)',
];

const RULE_STATUS_PRIORITY: Record<Exclude<RuleStatusFilter, 'all'>, number> = {
  official: 0,
  learned: 1,
  pending: 2,
};

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

function parseIsoTime(value?: string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function toProfileOption(
  profile: ProfileCatalogItem,
  index: number,
  baseStandard: BaseStandardVersion,
): SchoolOption {
  const ruleCount = Math.max(profile.ruleCount || 0, 0);
  return {
    id: profile.schoolId,
    name: profile.name,
    faculty: profile.faculty || '',
    match: Math.min(100, 60 + Math.round(ruleCount / 4)),
    rules: ruleCount,
    version: profile.version,
    initial: profile.name.trim().slice(0, 1) || '校',
    accent: PROFILE_ACCENTS[index % PROFILE_ACCENTS.length],
    baseStandardVersion: baseStandard,
    effectiveFrom: profile.effectiveFrom,
    sourceType: profile.sourceType === 'official' || profile.sourceType === 'seed'
      ? 'seed'
      : profile.sourceType === 'detected'
      ? 'detected'
      : 'learned',
    uploadCount: profile.uploadCount,
    recentUsageCount7d: profile.recentUsageCount7d || 0,
    recentHitRate7d: profile.recentHitRate7d || 0,
    lastUsedAt: profile.lastUsedAt || null,
  };
}

const Step2Profile: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const legacyDocId = getLegacyDocumentId(state);
  const [q, setQ] = useState('');
  const [ruleStatusFilter, setRuleStatusFilter] = useState<RuleStatusFilter>('official');
  const [pendingProfilesExpanded, setPendingProfilesExpanded] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const [profileCatalog, setProfileCatalog] = useState<ProfileCatalogItem[]>([]);
  const [selectedProfileDetail, setSelectedProfileDetail] = useState<SchoolProfile | null>(null);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [baseStandard, setBaseStandard] = useState<BaseStandardVersion>(defaultBaseStandardVersion());

  const refreshProfiles = useCallback(async () => {
    const result = await api.listProfiles();
    setProfileCatalog(result.profiles);
    return result.profiles;
  }, []);

  const localFallbackProfiles = React.useMemo(
    () => getSchoolOptions().map((profile) => ({
      ...profile,
      baseStandardVersion: baseStandard,
      sourceType: profile.sourceType || 'official',
    })),
    [baseStandard],
  );

  const profileOptions = React.useMemo(
    () => {
      const options = profileCatalog.length > 0
        ? profileCatalog.map((profile, index) => toProfileOption(profile, index, baseStandard))
        : localFallbackProfiles;

      return options.sort((left, right) => {
      const leftStatus = getProfileRuleStatus(left);
      const rightStatus = getProfileRuleStatus(right);
      const statusDiff = RULE_STATUS_PRIORITY[leftStatus] - RULE_STATUS_PRIORITY[rightStatus];
      if (statusDiff !== 0) return statusDiff;
      const recentUsageDiff = (right.recentUsageCount7d || 0) - (left.recentUsageCount7d || 0);
      if (recentUsageDiff !== 0) return recentUsageDiff;
      const recentHitRateDiff = (right.recentHitRate7d || 0) - (left.recentHitRate7d || 0);
      if (recentHitRateDiff !== 0) return recentHitRateDiff;
      const recentTimeDiff = parseIsoTime(right.lastUsedAt) - parseIsoTime(left.lastUsedAt);
      if (recentTimeDiff !== 0) return recentTimeDiff;
      const uploadDiff = (right.uploadCount || 0) - (left.uploadCount || 0);
      if (uploadDiff !== 0) return uploadDiff;
      const matchDiff = right.match - left.match;
      if (matchDiff !== 0) return matchDiff;
      return left.name.localeCompare(right.name, 'zh-CN');
      });
    },
    [baseStandard, localFallbackProfiles, profileCatalog],
  );
  const ruleStatusCounts = React.useMemo(() => {
    const counts: Record<RuleStatusFilter, number> = {
      all: profileOptions.length,
      official: 0,
      learned: 0,
      pending: 0,
    };
    for (const profile of profileOptions) {
      counts[getProfileRuleStatus(profile)] += 1;
    }
    return counts;
  }, [profileOptions]);
  const selected = React.useMemo(
    () => profileOptions.find((profile) => profile.id === state.schoolId) || null,
    [profileOptions, state.schoolId],
  );
  const selectedRuleCount = React.useMemo(() => {
    const detailRuleCount = (selectedProfileDetail?.rulesJson?.length || 0) + (selectedProfileDetail?.styleMap?.length || 0);
    return Math.max(selected?.rules || 0, detailRuleCount);
  }, [selected?.rules, selectedProfileDetail]);
  const selectedRuleStatus = selected
    ? getProfileRuleStatus({ sourceType: selected.sourceType, rules: selectedRuleCount })
    : null;
  const queryMatchedProfiles = profileOptions.filter((profile) => {
    const matchesQuery = !q || profile.name.includes(q) || profile.faculty.includes(q);
    return matchesQuery;
  });
  const pendingProfiles = queryMatchedProfiles.filter((profile) => getProfileRuleStatus(profile) === 'pending');
  const visiblePendingProfiles = ruleStatusFilter === 'all' && pendingProfilesExpanded ? pendingProfiles : [];
  const hiddenPendingCount = ruleStatusFilter === 'all' && !pendingProfilesExpanded ? pendingProfiles.length : 0;
  const filtered = ruleStatusFilter === 'all'
    ? queryMatchedProfiles.filter((profile) => getProfileRuleStatus(profile) !== 'pending').concat(visiblePendingProfiles)
    : queryMatchedProfiles.filter((profile) => getProfileRuleStatus(profile) === ruleStatusFilter);

  useEffect(() => {
    if (ruleStatusFilter !== 'all') {
      setPendingProfilesExpanded(false);
      return;
    }
    if (pendingProfiles.length === 0) {
      setPendingProfilesExpanded(false);
    }
  }, [pendingProfiles.length, ruleStatusFilter]);

  useEffect(() => {
    if (!selected || state.schoolId === 'draft') {
      setSelectedProfileDetail(null);
      setProfileDetailLoading(false);
      return;
    }

    let cancelled = false;
    setProfileDetailLoading(true);
    api.getProfile(selected.id)
      .then((detail) => {
        if (cancelled) return;
        setSelectedProfileDetail(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('profile detail failed:', err);
        setSelectedProfileDetail(null);
      })
      .finally(() => {
        if (!cancelled) setProfileDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, state.schoolId]);

  const startParse = () => {
    if (!state.doc) { showToast('请先上传论文文档'); return; }
    if (selectedRuleStatus === 'pending') {
      showToast('这所学校还处在待补规则状态，请先补充模板或改选已有规则包');
      return;
    }
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
      set({
        schoolId: null,
        draftSchool: {
          id: 'draft',
          name: inferred.name,
          faculty: inferred.faculty,
          rules,
          match: Math.min(100, 60 + Math.round(rules / 4)),
          baseStandardVersion: baseStandard,
        },
      });
      showToast(`已生成规则草案 · ${inferred.name}，确认后可以继续体检`);
    } catch (err: any) {
      showToast(`模板解析失败: ${err.message}`);
    }
  }, [baseStandard, set, showToast]);

  const onTemplateFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleTemplate(files[0]);
    e.target.value = '';
  }, [handleTemplate]);

  const useDraftProfile = useCallback(() => {
    const name = state.draftSchool?.name || '自定义';
    set({ schoolId: 'draft', draftSchool: null });
    showToast(`已选用 · ${name} 规则包`);
  }, [set, showToast, state.draftSchool]);

  useEffect(() => {
    if (!legacyDocId) return;
    const docId = legacyDocId;
    let cancelled = false;

    const run = async () => {
      set({ detecting: true });
      try {
        const [detectResult, profiles] = await Promise.all([
          api.detectSchool(docId),
          refreshProfiles(),
        ]);
        if (cancelled) return;

        if (detectResult.detected && detectResult.name) {
          const knownProfile = detectResult.existingSchoolId
            ? profiles.find((profile) => profile.schoolId === detectResult.existingSchoolId)
            : profiles.find((profile) => profile.name === detectResult.name);

          if (knownProfile) {
            set({
              schoolId: knownProfile.schoolId,
              detectedSchool: null,
            });
            showToast(`检测到 ${knownProfile.name}，已自动选择`);
            return;
          }

          set({
            detectedSchool: {
              name: detectResult.name,
              confidence: detectResult.confidence,
              isNew: true,
              existingSchoolId: null,
            },
          });

          try {
            const created = await api.autoCreateSchool(detectResult.name, docId);
            if (cancelled) return;
            await refreshProfiles();
            if (cancelled) return;
            set({
              schoolId: created.schoolId,
              detectedSchool: null,
            });
            showToast(`检测到 ${detectResult.name}，已自动建档并选用`);
          } catch (err: any) {
            if (cancelled) return;
            showToast(`检测到 ${detectResult.name}，但自动建档失败：${err.message}`);
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
  }, [legacyDocId, refreshProfiles, set, showToast]);

  const handleAutoCreate = async () => {
    if (!state.detectedSchool || !legacyDocId) return;
    try {
      const result = await api.autoCreateSchool(state.detectedSchool.name, legacyDocId);
      await refreshProfiles();
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
        ruleStatusFilter={ruleStatusFilter}
        ruleStatusCounts={ruleStatusCounts}
        baseStandard={baseStandard}
        filtered={filtered}
        allOptionsCount={profileOptions.length}
        hiddenPendingCount={hiddenPendingCount}
        detecting={state.detecting}
        detectedSchool={state.detectedSchool}
        selectedSchoolId={state.schoolId}
        onQueryChange={setQ}
        onRuleStatusFilterChange={(value) => {
          setRuleStatusFilter(value);
          if (value !== 'all') {
            setPendingProfilesExpanded(false);
          }
        }}
        onRevealPendingProfiles={() => setPendingProfilesExpanded(true)}
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
              <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.6, maxWidth: 320 }}>
                选定学校 / 学院规范后，下一步会直接进入发现项体检，不再回到旧的浏览模式分支。
              </div>
            </div>
          </div>
        ) : (
          <SelectedProfileSummary
            profile={selected}
            profileDetail={selectedProfileDetail}
            loading={profileDetailLoading}
            effectiveFromLabel={fmtDate(selected.effectiveFrom)}
            onShowRules={() => setShowRules(true)}
            onStartParse={startParse}
            onOpenTemplateUpload={() => templateInputRef.current?.click()}
          />
        )}
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} school={selected} profileDetail={selectedProfileDetail} />}
    </div>
  );
};

export default Step2Profile;
