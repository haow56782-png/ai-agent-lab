import { Btn } from '../../components/Common';

interface Step4DiffFooterProps {
  blockingPendingCount: number;
  completedFindingCount: number;
  downloadReadyPulse: boolean;
  isDownloadAllowed: boolean;
  p0PendingCount: number;
  p1PendingCount: number;
  p2PendingCount: number;
  pendingCount: number;
  totalFindingCount: number;
  downloadLabel: string;
  acceptAllLabel: string;
  onAcceptAll: () => void;
  onDownload: () => void;
}

export function Step4DiffFooter({
  acceptAllLabel,
  blockingPendingCount,
  completedFindingCount,
  downloadLabel,
  downloadReadyPulse,
  isDownloadAllowed,
  onAcceptAll,
  onDownload,
  p0PendingCount,
  p1PendingCount,
  p2PendingCount,
  pendingCount,
  totalFindingCount,
}: Step4DiffFooterProps) {
  return (
    <footer
      style={{
        minHeight: 72,
        borderTop: '1px solid var(--rule-line)',
        background: 'rgba(253,252,250,.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
        position: 'sticky',
        bottom: 0,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
        }}
      >
        <span className={`diff-footer-status-dot${isDownloadAllowed ? ' is-complete' : ' is-pending'}`} />
        <span
          data-testid="diff-footer-status"
          style={{
            fontSize: 'var(--text-sm)',
            color: isDownloadAllowed ? 'var(--accepted-green)' : 'var(--ink-secondary)',
          }}
        >
          已处置 {completedFindingCount}/{totalFindingCount} 项 · P0 剩 {p0PendingCount} / P1 剩 {p1PendingCount} / P2 剩 {p2PendingCount}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {pendingCount > 0 && (
          <Btn
            kind="ghost"
            size="md"
            onClick={onAcceptAll}
            style={{
              color: 'var(--ink-primary)',
              borderColor: 'var(--ink-primary)',
              background: 'transparent',
            }}
          >
            {acceptAllLabel}
          </Btn>
        )}
        <Btn
          kind={isDownloadAllowed ? 'brand' : 'ghost'}
          size="md"
          icon="download"
          onClick={onDownload}
          style={{
            background: isDownloadAllowed ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
            borderColor: isDownloadAllowed ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
            color: '#fff',
            animation: downloadReadyPulse ? 'diffBannerComplete 600ms var(--ease-standard)' : 'none',
          }}
          title={!isDownloadAllowed ? `还有 ${blockingPendingCount} 项 P0/P1 发现需要处理或豁免` : undefined}
        >
          {downloadLabel}
        </Btn>
      </div>
    </footer>
  );
}
