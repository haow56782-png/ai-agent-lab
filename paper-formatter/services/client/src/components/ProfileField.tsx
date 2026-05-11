import React from 'react';
import { Icon } from './Common';

interface ProfileFieldProps {
  label: string;
  value: string;
  arrow?: boolean;
  accent?: boolean;
}

export const ProfileField: React.FC<ProfileFieldProps> = ({ label, value, arrow = false, accent = false }) => (
  <div style={{
    border: `1px solid ${accent ? 'var(--sun-500)' : 'var(--hair-strong)'}`,
    borderRadius: 4,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    background: accent ? 'var(--sun-100)' : 'var(--paper-0)',
    cursor: 'pointer',
  }}>
    <div style={{ fontSize: 10, color: accent ? 'var(--sun-700)' : 'var(--ink-500)', letterSpacing: '.04em' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{value}</div>
      {arrow && <Icon name="chevron" size={12} color="var(--ink-400)" />}
    </div>
  </div>
);
