import React from 'react';

interface PrintPreviewModalProps {
  show: boolean;
  canDownloadRealOutput: boolean;
  onClose: () => void;
  onExportAll: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  show, canDownloadRealOutput, onClose, onExportAll,
}) => !show ? null : (
  <div className="modal-backdrop" style={{
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(21,23,27,.5)',
    animation: 'protoFade .15s ease',
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      background: 'var(--paper-0)', borderRadius: 6,
      width: 720, maxHeight: '85vh',
      display: 'flex', flexDirection: 'column',
      boxShadow: 'var(--shadow-card)', overflow: 'hidden',
      animation: 'protoFadeUp .2s ease',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--hair)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🖨</span>
          <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>打印预览</span>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 14, border: 'none',
          background: 'var(--paper-2)', cursor: 'pointer', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-500)',
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: 'var(--paper-2)' }}>
        <div style={{
          width: '100%', maxWidth: 580, margin: '0 auto',
          background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,.08)',
          padding: '40px 36px', position: 'relative',
          border: '1px solid var(--hair)',
        }}>
          <div style={{
            position: 'absolute', inset: '25mm 30mm 25mm 25mm',
            border: '1px dashed rgba(0,0,0,.08)', pointerEvents: 'none',
          }} />
          <div style={{ position: 'absolute', bottom: '17.5mm', left: 0, right: 0, textAlign: 'center', fontSize: 8, color: 'rgba(0,0,0,.2)' }}>
            — 1 —
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 20, color: '#000' }}>
            第一章 绪论
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: '#333' }}>
            <div style={{ textIndent: '2em' }}>
              随着深度学习技术的快速发展，图像超分辨率重建已成为计算机视觉领域的研究热点。
              近年来，基于卷积神经网络（CNN）的方法在图像超分辨率任务中取得了显著进展。
            </div>
            <div style={{ textIndent: '2em', marginTop: 6 }}>
              然而，现有方法在处理大尺度因子（如 4×、8×）时仍面临挑战，
              主要表现为重建结果中出现模糊和伪影等问题。
            </div>
            <div style={{ textIndent: '2em', marginTop: 6 }}>
              本文提出了一种基于改进残差稠密网络的图像超分辨率重建方法，
              通过引入注意力机制和多尺度特征融合策略，有效提升了重建质量。
            </div>
            <div style={{
              marginTop: 12, padding: '8px 10px', background: '#f8f8f8',
              borderLeft: '3px solid #ccc', fontSize: 11,
            }}>
              图 3-1  模型结构示意图
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--hair)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12, color: 'var(--ink-600)',
      }}>
        <span>纸张：A4 | 页边距：上25/下25/左30/右25mm</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            height: 32, padding: '0 14px', borderRadius: 3,
            border: '1px solid var(--hair-strong)', background: 'transparent',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)',
            color: 'var(--ink-700)',
          }}>关闭预览</button>
          <button onClick={() => { onClose(); onExportAll(); }} style={{
            height: 32, padding: '0 14px', borderRadius: 3,
            border: 'none', background: canDownloadRealOutput ? 'var(--ink-900)' : 'var(--ink-300)', color: 'var(--paper-0)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
          }} disabled={!canDownloadRealOutput}>
            📥 下载修正稿
          </button>
        </div>
      </div>
    </div>
  </div>
);
