import { Btn } from '../../components/Common';
import { ExportConfirmDialog } from '../../components/ExportConfirmDialog';
import type { Finding } from '../../stores/reviewStore';
import type { ContentIntegrityView } from '../../utils/contentIntegrityView';
import type { DiffCopyShape } from './diffCopy';

type DiffTranslator = (key: keyof DiffCopyShape, vars?: Record<string, string | number>) => string;

interface Step4DiffModalsProps {
  acceptedCount: number;
  contentIntegrity: ContentIntegrityView;
  copy: DiffCopyShape;
  effectivePassed: number;
  ignoredCount: number;
  pendingFindings: Finding[];
  p1PendingFindings: Finding[];
  showAcceptAllConfirm: boolean;
  showExemptionConfirm: boolean;
  showExportConfirm: boolean;
  t: DiffTranslator;
  downloadController: {
    confirmExport: () => Promise<void>;
    confirmP1Exemption: () => void;
    exemptionReason: string;
    exemptionRiskAccepted: boolean;
    exportFileName: string;
    exportFileNameEditing: boolean;
    setExemptionReason: (value: string) => void;
    setExemptionRiskAccepted: (value: boolean) => void;
    setExportFileName: (value: string) => void;
    setExportFileNameEditing: (updater: (value: boolean) => boolean) => void;
    setShowExemptionConfirm: (value: boolean) => void;
    setShowExportConfirm: (value: boolean) => void;
  };
  onAcceptAll: () => void;
  onCloseAcceptAll: () => void;
}

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(21,23,27,.24)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1400,
  padding: 24,
} as const;

const modalPanelStyle = {
  width: '100%',
  background: 'var(--paper)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-modal)',
  padding: '28px 28px 24px',
} as const;

export function Step4DiffModals({
  acceptedCount,
  contentIntegrity,
  copy,
  downloadController,
  effectivePassed,
  ignoredCount,
  pendingFindings,
  p1PendingFindings,
  showAcceptAllConfirm,
  showExemptionConfirm,
  showExportConfirm,
  t,
  onAcceptAll,
  onCloseAcceptAll,
}: Step4DiffModalsProps) {
  if (showAcceptAllConfirm) {
    return (
      <div className="modal-backdrop" style={modalBackdropStyle}>
        <div style={{ ...modalPanelStyle, maxWidth: 480 }}>
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontFamily: 'var(--font-serif)',
              color: 'var(--ink-text)',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            {t('accept_all_confirm_title', { count: t('change_count', { count: pendingFindings.length }) })}
          </div>
          <div
            style={{
              fontSize: 'var(--text-md)',
              color: 'var(--ink-secondary)',
              lineHeight: 'var(--leading-normal)',
              marginBottom: 24,
            }}
          >
            {copy.accept_all_confirm_body}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Btn kind="ghost" size="md" onClick={onCloseAcceptAll}>
              {copy.cancel}
            </Btn>
            <Btn kind="brand" size="md" onClick={onAcceptAll}>
              {copy.accept_all_confirm_action}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (showExemptionConfirm) {
    return (
      <div className="modal-backdrop" style={modalBackdropStyle}>
        <div style={{ ...modalPanelStyle, maxWidth: 540 }}>
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontFamily: 'var(--font-serif)',
              color: 'var(--ink-text)',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            仍有 {p1PendingFindings.length} 项 P1 发现未处理，是否签字豁免？
          </div>
          <div
            style={{
              fontSize: 'var(--text-md)',
              color: 'var(--ink-secondary)',
              lineHeight: 'var(--leading-normal)',
              marginBottom: 16,
            }}
          >
            P1 默认会阻塞下载。你可以作为作者签字豁免，但系统会把理由写入审计记录；P0 发现仍然不能豁免。
          </div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
            {p1PendingFindings.slice(0, 4).map((finding) => (
              <div key={finding.finding_id} style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-text)' }}>
                <strong>{finding.ruleBreadcrumb.at(-1)}</strong>
                <span style={{ color: 'var(--ink-secondary)' }}> · 第 {finding.pageNo} 页 · {finding.problem}</span>
              </div>
            ))}
          </div>
          <textarea
            value={downloadController.exemptionReason}
            onChange={(event) => downloadController.setExemptionReason(event.target.value)}
            placeholder="请写明为什么允许这些 P1 发现暂不处理，至少 20 个字"
            style={{
              width: '100%',
              minHeight: 92,
              resize: 'vertical',
              border: '1px solid var(--rule-line)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-text)',
              background: '#fff',
              marginBottom: 12,
            }}
          />
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 22 }}>
            <input
              type="checkbox"
              checked={downloadController.exemptionRiskAccepted}
              onChange={(event) => downloadController.setExemptionRiskAccepted(event.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>我承担未处理 P1 发现带来的交稿风险，并同意写入审计记录。</span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Btn kind="ghost" size="md" onClick={() => downloadController.setShowExemptionConfirm(false)}>
              {copy.cancel}
            </Btn>
            <Btn kind="brand" size="md" onClick={downloadController.confirmP1Exemption}>
              签字豁免并继续下载
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (showExportConfirm) {
    return (
      <ExportConfirmDialog
        effectivePassed={effectivePassed}
        acceptedCount={acceptedCount}
        contentIntegrity={contentIntegrity}
        ignoredCount={ignoredCount}
        exportFileName={downloadController.exportFileName}
        exportFileNameEditing={downloadController.exportFileNameEditing}
        onFileNameChange={downloadController.setExportFileName}
        onFileNameEditToggle={() => downloadController.setExportFileNameEditing((value) => !value)}
        onCancel={() => downloadController.setShowExportConfirm(false)}
        onConfirm={() => {
          downloadController.setShowExportConfirm(false);
          void downloadController.confirmExport();
        }}
      />
    );
  }

  return null;
}
