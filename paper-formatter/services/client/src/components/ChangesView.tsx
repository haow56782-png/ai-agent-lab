import React from 'react';
import { Btn } from './Common';

interface ChangeCardItem {
  id: string;
  title: string;
  section: string;
  sectionKey: string;
  pageNum: number;
  beforeValue: string;
  afterValue: string;
  status: 'pass' | 'review';
  userAction?: 'accepted' | 'ignored' | null;
}

interface ChangesViewProps {
  sections: { key: string; label: string; items: ChangeCardItem[] }[];
  onExport: () => void;
}

export const ChangesView: React.FC<ChangesViewProps> = ({ sections, onExport }) => (
  <div style={{
    padding: '20px 28px', background: 'var(--paper-1)',
    flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
  }}>
    {sections.length === 0 ? (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12, color: 'var(--ink-500)',
      }}>
        <div style={{ fontSize: 32 }}>✅</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-900)' }}>这篇论文目前没有需要你确认的变化</div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>排版结果已经比较干净，可以直接进入交稿导出</div>
        <Btn kind="primary" size="md" icon="download" onClick={onExport}>进入导出</Btn>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
          padding: '16px 18px',
        }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 6 }}>
            最后一公里，由你亲自确认
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            这里展示的是系统准备替你落到稿件里的变化。你可以把它当作交稿前的总核对单，确认每一处都符合你的预期。
          </div>
        </div>
        {sections.map(section => (
          <div key={section.key}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--ink-900)',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{section.label}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', fontWeight: 400 }}>
                {section.items.filter(i => i.status === 'review').length > 0
                  ? `${section.items.filter(i => i.status === 'review').length} 处等你确认`
                  : `${section.items.length} 处已经处理完成`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {section.items.map(item => (
                <div key={item.id} style={{
                  background: '#fff',
                  borderRadius: 6, padding: '12px 14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                  borderLeft: `3px solid ${item.status === 'review' ? 'var(--sun-500)' : 'var(--leaf-500)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-900)', marginBottom: 4 }}>
                        {item.title}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 6 }}>
                        第 {item.pageNum} 页 · {item.section}
                      </div>
                      <div style={{
                        background: 'var(--paper-1)', borderRadius: 4, padding: '8px 10px',
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-400)', marginRight: 6 }}>原稿</span>
                          {item.beforeValue}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--leaf-700)' }}>
                          <span className="mono" style={{ fontSize: 9, color: 'var(--leaf-500)', marginRight: 6 }}>交稿版</span>
                          {item.afterValue}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {item.status === 'review' ? (
                        <span className="chip sun" style={{ height: 20, fontSize: 10 }}>等你确认</span>
                      ) : (
                        <span className="chip leaf" style={{ height: 20, fontSize: 10 }}>✓ 已准备落稿</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
