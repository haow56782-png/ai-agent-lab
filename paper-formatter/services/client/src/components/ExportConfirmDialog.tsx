import React from 'react';
import { Btn } from './Common';

interface ExportConfirmDialogProps {
  effectivePassed: number;
  acceptedCount: number;
  ignoredCount: number;
  exportFileName: string;
  exportFileNameEditing: boolean;
  onFileNameChange: (name: string) => void;
  onFileNameEditToggle: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExportConfirmDialog: React.FC<ExportConfirmDialogProps> = ({
  effectivePassed, acceptedCount, ignoredCount,
  exportFileName, exportFileNameEditing,
  onFileNameChange, onFileNameEditToggle,
  onCancel, onConfirm,
}) => (
  <div style={{
    padding: '28px 40px', background: 'var(--paper-1)',
    flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
  }}>
    <div style={{
      background: 'var(--paper-0)', borderRadius: 6,
      border: '1px solid var(--hair)', boxShadow: 'var(--shadow-card)',
      padding: '28px 32px', maxWidth: 520, width: '100%',
      animation: 'protoFadeUp .2s ease',
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
      <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 20 }}>
        交稿前最后确认
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55, marginBottom: 18 }}>
        再确认一次文件名和这轮处理结果，确认无误后，就可以把这篇论文带着更稳的底气交出去。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--leaf-700)' }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--leaf-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✅</span>
          格式处理：{effectivePassed} 项已自动推进
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--leaf-700)' }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--leaf-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✅</span>
          人工确认：{acceptedCount + ignoredCount} 项已经由你亲自过目
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--leaf-700)' }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--leaf-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, marginTop: 1 }}>✅</span>
          <span>正文内容：与原稿完全一致（仅调整了格式，未改动任何文字内容）</span>
        </div>
        {ignoredCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sun-700)' }}>
            <span style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--sun-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>⚠</span>
            你保留了 {ignoredCount} 项未采纳建议
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--hair)', margin: '16px 0' }} />

      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6 }}>交稿文件名：</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        {exportFileNameEditing ? (
          <input autoFocus value={exportFileName} onChange={e => onFileNameChange(e.target.value)}
            style={{
              flex: 1, height: 32, padding: '0 10px', border: '1px solid var(--brand-700)',
              borderRadius: 4, fontSize: 13, fontFamily: 'var(--mono)',
              background: '#fff', color: 'var(--ink-900)',
            }} />
        ) : (
          <>
            <span className="mono" style={{ fontSize: 13, color: 'var(--ink-900)' }}>{exportFileName}</span>
            <button onClick={onFileNameEditToggle}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-400)' }}>✎</button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn kind="ghost" size="sm" onClick={onCancel}>取消</Btn>
        <Btn kind="primary" size="sm" icon="download" onClick={onConfirm}>
          确认并生成交稿稿件
        </Btn>
      </div>
    </div>
  </div>
);
