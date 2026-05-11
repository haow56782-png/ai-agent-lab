import React from 'react';

interface FixInfoCardProps {
  schoolName: string;
  schoolVersion?: string;
  doneCount: number;
  totalCount: number;
  paid: boolean;
}

export const FixInfoCard: React.FC<FixInfoCardProps> = ({
  schoolName, schoolVersion, doneCount, totalCount, paid,
}) => (
  <div style={{
    background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
    padding: '14px 16px',
  }}>
    <div className="mono" style={{ fontSize: 10, letterSpacing: '.16em', color: 'var(--ink-400)', marginBottom: 8 }}>
      任务边界
    </div>
    <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ink-600)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
        <span>当前规范</span>
        <span className="mono" style={{ color: 'var(--ink-900)' }}>
          {schoolName ? `${schoolName}${schoolVersion ? ` · ${schoolVersion}` : ''}` : '浏览模式'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed var(--hair)' }}>
        <span>处理边界</span>
        <span className="mono" style={{ color: 'var(--ink-900)' }}>仅排版层 · 不改正文</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed var(--hair)' }}>
        <span>已写回 / 总计</span>
        <span className="mono" style={{ color: 'var(--ink-900)' }}>{doneCount} / {totalCount}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed var(--hair)' }}>
        <span>任务控制</span>
        <span className="mono" style={{ color: 'var(--ink-900)' }}>当前不支持暂停服务器任务</span>
      </div>
      {paid && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed var(--hair)' }}>
          <span>解锁状态</span>
          <span className="mono" style={{ color: 'var(--leaf-700)' }}>已解锁</span>
        </div>
      )}
    </div>
  </div>
);
