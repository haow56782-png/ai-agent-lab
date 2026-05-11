import React from 'react';
import { getRulesByCategory } from '../constants/rules';

type SchoolLike = {
  name: string;
  faculty?: string;
  version?: string;
  rules?: number;
};

interface RulesModalProps {
  onClose: () => void;
  school?: SchoolLike | null;
}

const RulesModal: React.FC<RulesModalProps> = ({ onClose, school }) => {
  const groupedRules = getRulesByCategory();

  return (
    <div className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(21,23,27,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        animation: 'protoFade .18s ease',
      }}
    >
      <div
        style={{
          background: 'var(--paper-0)',
          borderRadius: 6,
          width: 720,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid var(--hair)',
          }}
        >
          <div>
            <div
              className="serif"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink-900)',
              }}
            >
              这篇论文将遵循的完整规则
            </div>

            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: 'var(--ink-500)',
                marginTop: 2,
              }}
            >
              {school
                ? `${school.name} · ${school.faculty || ''} · ${school.version || 'vAuto'} · ${school.rules || 0} 条`
                : '请先选择学校规范'}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: 'var(--paper-2)',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-500)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          padding: '10px 22px',
          borderBottom: '1px solid var(--hair)',
          fontSize: 12,
          color: 'var(--ink-600)',
          lineHeight: 1.55,
          background: 'var(--paper-1)',
        }}>
          这不是一份抽象配置，而是系统接下来替你整理论文时真正会落下去的交稿标准。看得越清楚，交稿时越安心。
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '10px 0' }}>
          {groupedRules.map((group) => (
            <div
              key={group.categoryCode}
              style={{
                borderBottom: '1px solid var(--hair)',
                padding: '10px 22px 14px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink-900)',
                  marginBottom: 8,
                }}
              >
                {group.category}
              </div>

              {group.rules.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 1fr',
                    gap: 8,
                    padding: '4px 0',
                    fontSize: 12,
                    color: 'var(--ink-700)',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      color: 'var(--ink-400)',
                      fontSize: 10.5,
                    }}
                  >
                    {rule.id}
                  </span>
                  <span>{rule.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
