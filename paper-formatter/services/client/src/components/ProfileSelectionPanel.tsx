import React from 'react';
import { Icon, Btn } from './Common';
import { BaseStandardSelector } from './BaseStandardSelector';
import { DetectionBanner } from './DetectionBanner';
import { SchoolListItem } from './SchoolListItem';
import type { BaseStandardVersion, SchoolOption } from './AppFrame';

interface DetectionState {
  name: string;
  confidence: number;
  existingSchoolId: string | null;
}

interface ProfileSelectionPanelProps {
  query: string;
  baseStandard: BaseStandardVersion;
  filtered: SchoolOption[];
  allOptionsCount: number;
  uploadCountMap: Record<string, number>;
  detecting: boolean;
  detectedSchool: DetectionState | null;
  selectedSchoolId: string | null;
  onQueryChange: (value: string) => void;
  onBaseStandardChange: (value: BaseStandardVersion) => void;
  onSelectSchool: (school: SchoolOption) => void;
  onAutoCreateSchool: () => void;
  onDismissDetectedSchool: () => void;
  onOpenTemplateUpload: () => void;
  formatDate: (dateStr?: string | null) => string;
}

export const ProfileSelectionPanel: React.FC<ProfileSelectionPanelProps> = ({
  query,
  baseStandard,
  filtered,
  allOptionsCount,
  uploadCountMap,
  detecting,
  detectedSchool,
  selectedSchoolId,
  onQueryChange,
  onBaseStandardChange,
  onSelectSchool,
  onAutoCreateSchool,
  onDismissDetectedSchool,
  onOpenTemplateUpload,
  formatDate,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <div className="secdex" style={{ marginBottom: 10 }}>第二步 · SCHOOL PROFILE</div>
    <h2 className="serif" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.4 }}>
      选对规范，论文才会走得更稳
    </h2>
    <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '0 0 18px', maxWidth: 520 }}>
      学校 / 学院 / 专业三级规则包会决定这篇论文最终按什么标准交付。未覆盖的院校，也可以上传模板自动反推规则。
    </p>
    <div style={{
      marginBottom: 14, padding: '10px 12px', borderRadius: 4,
      background: 'var(--paper-0)', border: '1px solid var(--hair)',
      fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55,
    }}>
      <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>规则分层：</span>
      <span>先确定国家标准基线，再叠加学校/学院规则包。这样系统才能把论文修到“学校愿意收、你自己也敢交”的状态。</span>
    </div>
    <BaseStandardSelector value={baseStandard} onChange={onBaseStandardChange} />

    {detecting && (
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
        正在从论文里识别学校线索…
      </div>
    )}
    {detectedSchool && !detectedSchool.existingSchoolId && (
      <DetectionBanner
        name={detectedSchool.name}
        confidence={detectedSchool.confidence}
        onAutoCreate={onAutoCreateSchool}
        onDismiss={onDismissDetectedSchool}
      />
    )}

    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--paper-0)', border: '1px solid var(--hair-strong)',
      borderRadius: 4, padding: '0 14px', height: 40, marginBottom: 12,
    }}>
      <Icon name="search" size={15} color="var(--ink-400)" />
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索学校 · 学院 · 专业"
        aria-label="搜索学校"
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, fontFamily: 'var(--sans)', color: 'var(--ink-900)',
        }}
      />
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>{filtered.length} / {allOptionsCount} 所</span>
    </div>

    <div className="list-stagger" style={{
      background: 'var(--paper-0)', border: '1px solid var(--hair)',
      borderRadius: 4, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column',
    }}>
      {filtered.map((school, i) => (
        <SchoolListItem
          key={school.id}
          school={school}
          selected={selectedSchoolId === school.id}
          uploadCount={uploadCountMap[school.id] || 0}
          showBorder={i < filtered.length - 1}
          effectiveFromLabel={school.effectiveFrom ? formatDate(school.effectiveFrom) : null}
          onSelect={() => onSelectSchool(school)}
        />
      ))}
      {filtered.length === 0 && (
        <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
          还没找到匹配学校。可以上传格式手册或范文，让系统帮你补齐这条路。
        </div>
      )}
    </div>

    <div className="card-hover"
      style={{
        marginTop: 12, padding: '14px 16px',
        border: '1.2px dashed var(--ink-300)', borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      }}
      onClick={onOpenTemplateUpload}
    >
      <Icon name="upload" size={16} color="var(--ink-500)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 500 }}>没找到我的学校？</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>上传学校格式手册或一份范文，让系统为你的论文补出一套可用规则</div>
      </div>
      <Btn kind="ghost" size="sm" onClick={onOpenTemplateUpload}>补充模板</Btn>
    </div>
  </div>
);
