import React from 'react';
import type { ContentIntegrityView } from '../utils/contentIntegrityView';

interface DeliveryHeaderProps {
  contentIntegrity: ContentIntegrityView;
  deliveryNarrative: string;
  oldScore: number;
  newScore: number;
}

export const DeliveryHeader: React.FC<DeliveryHeaderProps> = ({
  contentIntegrity, deliveryNarrative, oldScore, newScore,
}) => (
  <div className="delivery-certificate-hero">
    <div>
      <div className="delivery-kicker">FINAL DELIVERY · 交稿证书</div>
      <div className="serif delivery-title">
        交稿前确认
      </div>
      <div className="delivery-narrative">
        {deliveryNarrative}
      </div>
      <div className="delivery-score-rail">
        <div>
          <div className="mono">处理前</div>
          <div className="mono num is-before">
            {oldScore}
          </div>
        </div>
        <div className="delivery-score-arrow">→</div>
        <div>
          <div className="mono">现在</div>
          <div className="mono num is-after">
            {newScore}
          </div>
        </div>
      </div>
    </div>
    <div className="delivery-integrity-card">
      <div>
        <div>{contentIntegrity.status === 'warning' ? '正文内容需要复核' : '正文指纹已纳入保护'}</div>
        <div className="mono" style={{ color: contentIntegrity.toneColor }}>
          {contentIntegrity.shortLabel} · {contentIntegrity.detail}
        </div>
      </div>
    </div>
  </div>
);
