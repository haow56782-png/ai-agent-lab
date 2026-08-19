import type { ContentIntegrityView } from '../../utils/contentIntegrityView';

interface Step4DiffBannerProps {
  body: string;
  countText: string;
  contentIntegrity: ContentIntegrityView;
  disciplineHint?: {
    discipline: 'stem' | 'humanities' | 'unknown';
    confidence: number;
    needsBanner: boolean;
    topSignals?: Array<{ label: string; detail: string }>;
  };
  iconGlyph: string;
  isComplete: boolean;
  label: string;
  onKeepStem?: () => void;
  onSwitchHumanities?: () => void;
  title: string;
  visible: boolean;
}

export function Step4DiffBanner({
  body,
  countText,
  contentIntegrity,
  disciplineHint,
  iconGlyph,
  isComplete,
  label,
  onKeepStem,
  onSwitchHumanities,
  title,
  visible,
}: Step4DiffBannerProps) {
  const showDisciplineConfirm = !!disciplineHint?.needsBanner && disciplineHint.discipline === 'stem';
  const topSignal = disciplineHint?.topSignals?.[0];
  return (
    <section
      data-testid={showDisciplineConfirm ? 'discipline-confirm-banner' : undefined}
      style={{
        minHeight: 144,
        padding: '24px 32px 20px',
        background: 'linear-gradient(135deg, #f4f8f5 0%, #e8f0eb 100%)',
        borderBottom: '1px solid var(--rule-line)',
        display: 'flex',
        alignItems: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 400ms var(--ease-standard), transform 400ms var(--ease-standard)',
        animation: isComplete ? 'diffBannerComplete 600ms var(--ease-standard)' : 'none',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '999px',
          background: 'var(--ink-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: 'var(--shadow-card)',
          marginRight: 20,
          flexShrink: 0,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        {iconGlyph}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--text-3xl)',
            lineHeight: 'var(--leading-tight)',
            color: 'var(--ink-primary)',
            fontWeight: 600,
            marginBottom: 10,
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 'var(--text-md)',
            lineHeight: 'var(--leading-normal)',
            color: 'var(--ink-secondary)',
            maxWidth: 760,
            marginTop: 8,
          }}
        >
          {body}
        </div>
        <div
          data-testid="diff-content-integrity"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            padding: '7px 10px',
            borderRadius: 'var(--radius-pill)',
            background: contentIntegrity.toneBackground,
            color: contentIntegrity.toneColor,
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 16,
              height: 16,
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,.72)',
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            {contentIntegrity.icon}
          </span>
          <span>{contentIntegrity.title}</span>
          <span style={{ fontWeight: 400, color: 'var(--ink-secondary)' }}>{contentIntegrity.detail}</span>
        </div>
        {showDisciplineConfirm && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,.72)',
              border: '1px solid rgba(41,78,58,.16)',
              color: 'var(--ink-secondary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <strong style={{ color: 'var(--ink-primary)' }}>已按理工科规则校验</strong>
            <span>
              {topSignal ? `${topSignal.label}: ${topSignal.detail}` : `置信度 ${(disciplineHint.confidence * 100).toFixed(0)}%`}
            </span>
            <button type="button" className="btn btn-dark" onClick={onKeepStem}>保持理工科</button>
            <button type="button" className="btn btn-secondary" onClick={onSwitchHumanities}>改为文科</button>
          </div>
        )}
      </div>
      <div
        style={{
          flexShrink: 0,
          minWidth: 112,
          padding: '10px 0 10px 18px',
          textAlign: 'center',
        }}
      >
        <div
          data-testid="diff-banner-count"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 48,
            lineHeight: 1,
            color: 'var(--ink-primary)',
            fontWeight: 700,
          }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            key={countText}
            style={{
              display: 'inline-block',
              animation: 'diffBadgeFlip 360ms var(--ease-standard)',
            }}
          >
            {countText}
          </span>
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            marginTop: 6,
            color: 'var(--ink-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </div>
      </div>
    </section>
  );
}
