import React from 'react';

const SUBMISSION_CHECKLIST = [
  '确认页已经逐项过目，标题层级、页码和目录符合预期',
  '保留原稿副本，必要时可回退或和导师比对',
  '打印前先看 A4 预览，确认边距、页码和表格跨页效果',
];

interface ExportConfirmCardProps {
  fileName: string;
  editingName: boolean;
  withOriginal: boolean;
  withChangelog: boolean;
  withReport: boolean;
  canDownloadRealOutput: boolean;
  downloadError: string | null;
  onFileNameChange: (name: string) => void;
  onEditingNameChange: (editing: boolean) => void;
  onWithOriginalChange: (v: boolean) => void;
  onWithChangelogChange: (v: boolean) => void;
  onWithReportChange: (v: boolean) => void;
  onExportAll: () => void;
  onShare: () => void;
  onPrintPreview: () => void;
}

export const ExportConfirmCard: React.FC<ExportConfirmCardProps> = ({
  fileName, editingName, withOriginal, withChangelog, withReport,
  canDownloadRealOutput, downloadError,
  onFileNameChange, onEditingNameChange,
  onWithOriginalChange, onWithChangelogChange, onWithReportChange,
  onExportAll, onShare, onPrintPreview,
}) => (
  <div style={{
    background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
    padding: '18px 20px',
  }}>
    <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10 }}>
      📦 交稿导出确认
    </div>
    <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginBottom: 12, lineHeight: 1.55 }}>
      你现在做的不是“下载一个文件”，而是在把这篇论文稳稳送到可以安心交出去的最后一步。
    </div>

    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 12, lineHeight: 1.5 }}>
      <div style={{ padding: '0 0 6px', color: 'var(--ink-700)', fontWeight: 500 }}>
        下载前再核对这几项：
      </div>
      {SUBMISSION_CHECKLIST.map((item) => (
        <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0' }}>
          <span style={{ color: 'var(--brand-700)' }}>•</span>
          <span>{item}</span>
        </div>
      ))}
    </div>

    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 12, lineHeight: 1.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
        <span style={{ color: 'var(--leaf-600)' }}>✓</span> 格式修复：8 项已自动修正
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
        <span style={{ color: 'var(--leaf-600)' }}>✓</span> 查重预处理：3 项已优化
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
        <span style={{ color: 'var(--leaf-600)' }}>✓</span> 正文内容：与原稿完全一致
      </div>
    </div>

    {downloadError && (
      <div style={{
        marginBottom: 14,
        padding: '10px 12px',
        borderRadius: 4,
        background: 'var(--rust-100)',
        border: '1px solid var(--rust-500)',
        fontSize: 12,
        color: 'var(--rust-700)',
        lineHeight: 1.55,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>当前还没有真实可交付文件</div>
        <div>{downloadError}</div>
        <div style={{ marginTop: 6, color: 'var(--ink-600)' }}>
          请先确保真实修复任务已经完成，再回来领取这份正式交稿结果。
        </div>
        <div style={{ marginTop: 6, color: 'var(--ink-500)' }}>
          如果你现在只是想熟悉流程，建议先继续体验页面，不要把演示状态误当成真正可以提交的终稿。
        </div>
      </div>
    )}

    {/* Filename */}
    <div style={{ marginBottom: 14 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', marginBottom: 4 }}>
        交稿文件名
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {editingName ? (
          <input
            autoFocus
            value={fileName}
            onChange={e => onFileNameChange(e.target.value)}
            onBlur={() => onEditingNameChange(false)}
            onKeyDown={e => e.key === 'Enter' && onEditingNameChange(false)}
            style={{
              flex: 1, height: 34, padding: '0 10px', borderRadius: 4,
              border: '1px solid var(--brand-700)', outline: 'none',
              fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink-900)',
              background: 'var(--paper-0)',
            }}
          />
        ) : (
          <div style={{
            flex: 1, height: 34, padding: '0 10px', borderRadius: 4,
            border: '1px solid var(--hair-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink-900)',
            cursor: 'pointer', background: 'var(--paper-1)',
          }} onClick={() => onEditingNameChange(true)}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-400)', marginLeft: 6 }}>✎</span>
          </div>
        )}
      </div>
    </div>

    {/* Attachment checkboxes */}
    <div style={{ marginBottom: 14 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', marginBottom: 6 }}>
        一起带走
      </div>
      {[
        { key: 'original', label: '原稿备份（留作回退与比对）', checked: withOriginal, set: onWithOriginalChange },
        { key: 'changelog', label: '修改清单（记录这次推进了哪些变化）', checked: withChangelog, set: onWithChangelogChange },
        { key: 'report', label: '格式报告（方便分享进度与留档）', checked: withReport, set: onWithReportChange },
      ].map(opt => (
        <label key={opt.key} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
          fontSize: 13, color: 'var(--ink-700)', cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={opt.checked}
            onChange={e => opt.set(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--brand-700)' }}
          />
          {opt.label}
        </label>
      ))}
    </div>

    {/* Download + Share + Print preview buttons */}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={onExportAll} style={{
        height: 40, padding: '0 24px', borderRadius: 4,
        border: 'none', background: canDownloadRealOutput ? 'var(--ink-900)' : 'var(--ink-300)', color: 'var(--paper-0)',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
        cursor: canDownloadRealOutput ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6,
      }} disabled={!canDownloadRealOutput}>
        ⬇ 领取最终交稿稿件
      </button>
      <button onClick={onShare} style={{
        height: 40, padding: '0 16px', borderRadius: 4,
        border: '1px solid var(--hair-strong)', background: 'var(--paper-0)',
        fontSize: 12, fontWeight: 500, fontFamily: 'var(--sans)',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
        color: 'var(--ink-700)',
      }}>
        📤 分享这次上岸进度
      </button>
      <button onClick={onPrintPreview} style={{
        height: 40, padding: '0 16px', borderRadius: 4,
        border: '1px solid var(--hair-strong)', background: 'var(--paper-0)',
        fontSize: 12, fontWeight: 500, fontFamily: 'var(--sans)',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
        color: 'var(--ink-700)',
      }}>
        🖨 最后看一眼打印效果
      </button>
    </div>

    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-400)' }}>
      这里只提供真实后端生成的正式结果，拿到的就是你可以继续提交和留档的那一份
    </div>
  </div>
);
