import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon, Btn } from '../components/Common';
import { useApp, DEMO_DOC, getSchoolOptions } from '../components/AppFrame';
import { api } from '../api/client';

interface Props {
  showToast: (msg: string) => void;
}

const LEGACY_DOC_HINT = '如果你的文件来自 WPS 兼容模式或旧版 .doc，请先用 WPS / Word 打开后另存为标准 .docx 再上传。';

// P2 5-2: Check history types and localStorage management
export interface CheckHistoryItem {
  id: string;
  fileName: string;
  schoolName: string;
  specVersion: string;
  timestamp: number;
  summary: {
    total: number;
    passed: number;
    reviewed: number;
    failed: number;
  };
}

const HISTORY_KEY = 'remei_check_history';
const MAX_HISTORY = 10;

function loadHistory(): CheckHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  const d = new Date(ts);
  const now = new Date();
  if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) return '今天';
  if (d.getMonth() === now.getMonth() && now.getDate() - d.getDate() < 7) return `${now.getDate() - d.getDate()} 天前`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

const Step1Upload: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const [drag, setDrag] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<CheckHistoryItem[]>(loadHistory);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [uploadCountMap, setUploadCountMap] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!showSchoolModal) return;
    api.listProfiles().then(r => {
      const map: Record<string, number> = {};
      for (const p of r.profiles) map[p.schoolId] = p.uploadCount;
      setUploadCountMap(map);
    }).catch(() => {});
  }, [showSchoolModal]);

  // P2 5-2: Same-file detection — show toast if file was uploaded before
  useEffect(() => {
    if (!state.doc?.name) return;
    const match = history.find(h => h.fileName === state.doc.name);
    if (match) {
      showToast(`检测到你之前上传过同名文档（${formatTime(match.timestamp)}），本次将进行新的检测。`);
    }
  }, [state.doc?.name]);

  const cancelUpload = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setUploading(false);
    set({ uploadStage: 'idle', uploadPct: 0 });
    showToast('已取消上传');
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'docx' && ext !== 'pdf') {
      if (ext === 'pdf') {
        setUploadError('PDF 文件需先转为 Word 格式，再上传 .docx 文件');
      } else if (ext === 'doc' || ext === 'wps') {
        setUploadError(`当前文件是旧版 ${ext === 'doc' ? '.doc' : '.wps'} 格式，暂不支持直接排版。${LEGACY_DOC_HINT}`);
      } else {
        setUploadError('请上传 .docx 格式的 Word 文档');
      }
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 50) {
      setUploadError(`文件过大（当前 ${sizeMB.toFixed(0)} MB），请压缩图片后重新上传`);
      return;
    }

    setUploadError(null);
    setUploading(true);
    set({ rawFile: file, uploadStage: 'reading', uploadPct: 0 });

    const MIN_UPLOAD_MS = 600;
    const uploadStartedAt = Date.now();

    try {
      const { promise, xhr, abort } = api.uploadDocument(file, (pct) => {
        set({ uploadPct: pct });
      });
      abortRef.current = abort;
      const doc = await promise;
      abortRef.current = null;
      setUploading(false);

      const elapsed = Date.now() - uploadStartedAt;
      if (elapsed < MIN_UPLOAD_MS) {
        set({ uploadPct: 100 });
        await new Promise(r => setTimeout(r, MIN_UPLOAD_MS - elapsed));
      }

      const sizeLabel = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(sizeMB * 1024)} KB`;
      set({
        docId: doc.docId,
        doc: { name: file.name, size: sizeLabel, pages: 0 },
        uploadStage: 'done',
        uploadPct: 100,
      });
      showToast(`已上传 · ${file.name}`);
      setTimeout(() => set({ step: 2 }), 700);
    } catch (err: any) {
      abortRef.current = null;
      setUploading(false);
      if (err.name === 'AbortError') return;
      setUploadError(err.message);
      set({ uploadStage: 'idle', uploadPct: 0 });
      showToast(`上传失败: ${err.message}`);
    }
  }, []);

  const startUpload = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFile(files[0]);
    e.target.value = '';
  }, []);

  const useDemo = useCallback(() => {
    set({ uploadStage: 'reading', uploadPct: 0, rawFile: null });
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(100, p + 6 + Math.random() * 12);
      set({ uploadPct: Math.round(p) });
      if (p >= 100) {
        clearInterval(tick);
        set({ doc: DEMO_DOC, uploadStage: 'done', docId: 'demo' });
        showToast('已识别 .docx · 87 页 · 准备就绪');
        setTimeout(() => set({ step: 2 }), 700);
      }
    }, 110);
  }, []);

  return (
    <div style={{ flex: 1, padding: '40px 56px', overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40 }}>
      <div>
        <div className="secdex" style={{ marginBottom: 14 }}>第一步 · UPLOAD</div>
        <h1 className="serif" style={{
          margin: '0 0 12px', fontSize: 44, lineHeight: 1.1, letterSpacing: -.6,
          color: 'var(--ink-900)', fontWeight: 600,
        }}>
          把已经写好的论文，<br/>排成<span style={{ fontStyle: 'italic', color: 'var(--brand-700)' }}>合格</span>的 Word 文档。
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--ink-500)', maxWidth: 540, marginBottom: 28, lineHeight: 1.6 }}>
          上传 .docx 或 .pdf，系统只对排版层做变更，不改写一字论文内容。
          输出新的 Word 文档、规则命中报告与差异预览。
        </p>
        <div style={{
          marginBottom: 16, padding: '10px 12px', borderRadius: 4,
          background: 'var(--brand-50)', border: '1px solid rgba(59,92,130,.12)',
          fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55,
        }}>
          <span style={{ color: 'var(--brand-700)', fontWeight: 600 }}>上传提示：</span>
          <span>{LEGACY_DOC_HINT}</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".docx,.pdf"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${uploadError ? 'var(--sun-500)' : drag ? 'var(--brand-700)' : 'var(--ink-300)'}`,
            background: uploadError ? 'var(--sun-100)' : drag ? 'var(--brand-50)' : 'var(--paper-0)',
            borderRadius: 6, padding: '40px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 12, position: 'relative',
            transition: 'all .18s',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: uploadError ? 'var(--sun-100)' : 'var(--brand-50)',
            color: uploadError ? 'var(--sun-700)' : 'var(--brand-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: drag ? 'scale(1.12)' : 'scale(1)',
            transition: 'transform .25s cubic-bezier(.2,.8,.2,1)',
          }}>
            <Icon name="upload" size={22} />
          </div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)' }}>
            {uploadError ? '上传失败，请重试' : drag ? '松开以上传文件' : '拖入文档，或点击选择'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
            支持 <span className="mono">.docx</span> · <span className="mono">.pdf</span>（数字 / 扫描）· 单文件 ≤ 50 MB
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-400)', textAlign: 'center', maxWidth: 420, lineHeight: 1.5 }}>
            不支持直接上传旧版 <span className="mono">.doc</span> / <span className="mono">.wps</span> 兼容文件进行自动排版。
          </div>

          {state.uploadStage === 'reading' ? (
            <div style={{ width: 320, marginTop: 10 }}>
              <div style={{ height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${state.uploadPct}%`, background: 'var(--brand-700)',
                  transition: 'width .1s linear',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-500)' }}>
                <span>正在上传 {state.rawFile?.name || '…'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{state.uploadPct}%</span>
                  <button onClick={cancelUpload} style={{
                    background: 'var(--hair)', border: 'none', borderRadius: 3,
                    padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                    fontFamily: 'var(--mono)', color: 'var(--ink-500)',
                  }}>取消</button>
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Btn kind="primary" icon="upload" onClick={startUpload}>选择文件</Btn>
            </div>
          )}

          {/* P2 5-3: Trust text */}
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-400)', display: 'flex', gap: 4 }}>
            <span>已支持 <strong style={{ color: 'var(--brand-700)' }}>{getSchoolOptions().length}</strong> 所高校规范</span>
            <span>·</span>
            <button onClick={() => setShowSchoolModal(true)} style={{
              background: 'none', border: 'none', padding: 0,
              color: 'var(--brand-700)', cursor: 'pointer', fontSize: 12,
              fontFamily: 'var(--sans)', textDecoration: 'underline', textUnderlineOffset: 2,
            }}>查看支持列表 →</button>
          </div>

          <div style={{
            position: 'absolute', top: 10, right: 14, fontSize: 10,
            fontFamily: 'var(--mono)', color: 'var(--ink-400)', letterSpacing: '.1em',
          }}>{uploadError ? 'ERROR' : state.uploadStage === 'reading' ? 'UPLOADING' : 'DROP ZONE'}</div>
        </div>

        {uploadError && (
          <div style={{
            marginTop: 10, padding: '8px 12px', fontSize: 12, color: 'var(--rust-700)',
            background: 'var(--rust-100)', borderLeft: '3px solid var(--rust-500)',
            borderRadius: 3, fontFamily: 'var(--sans)', lineHeight: 1.4,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1 }}>{uploadError}</span>
            <button onClick={startUpload}
              style={{
                height: 24, padding: '0 10px', border: 'none', borderRadius: 3,
                background: 'var(--rust-500)', color: '#fff', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, fontFamily: 'var(--sans)',
                whiteSpace: 'nowrap',
              }}>重试</button>
          </div>
        )}

        <div style={{ marginTop: 18, display: 'flex', gap: 18, color: 'var(--ink-500)', fontSize: 12 }}>
          {['正文零篡改', '默认输出新文档，不覆盖原稿', '不用于模型训练'].map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={13} color="var(--leaf-700)" /> {t}
            </span>
          ))}
        </div>

        {state.uploadStage === 'idle' && (
          <button onClick={useDemo} style={{
            marginTop: 14, background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--brand-700)', fontSize: 12.5, fontFamily: 'var(--sans)',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}>没有文档？用一份示例论文走完流程 →</button>
        )}
      </div>

      <aside style={{
        background: 'var(--paper-0)', borderRadius: 6,
        border: '1px solid var(--hair)', padding: '20px 22px',
        display: 'flex', flexDirection: 'column', alignSelf: 'start',
      }}>
        {history.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>最近检测</div>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em' }}>HISTORY</span>
          </div>
        )}
        {history.slice(0, MAX_HISTORY).map((r, i, a) => (
          <div key={r.id} style={{
            padding: '12px 0', borderBottom: i < a.length - 1 ? '1px solid var(--hair)' : 'none',
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
          }}>
            <div style={{
              width: 28, height: 34, background: 'var(--brand-50)',
              color: 'var(--brand-700)',
              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 2, flex: '0 0 auto',
            }}>DOC</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.fileName}</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 3 }}>{r.schoolName} · {formatTime(r.timestamp)}</div>
              <div style={{ fontSize: 11, color: r.summary.failed > 0 ? 'var(--rust-700)' : r.summary.reviewed > 0 ? 'var(--sun-700)' : 'var(--leaf-700)', marginTop: 3 }}>
                {r.summary.failed > 0 ? '✗ ' : r.summary.reviewed > 0 ? '⚠ ' : '✓ '}
                通过 {r.summary.passed} · {r.summary.reviewed > 0 ? `${r.summary.reviewed} 项需复核` : `${r.summary.total} 项全部通过`}
              </div>
            </div>
          </div>
        ))}
      </aside>

      {/* P2 5-3: School list modal */}
      {showSchoolModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(21,23,27,.35)',
          animation: 'protoFade .15s ease',
        }} onClick={() => setShowSchoolModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--paper-0)', borderRadius: 8, padding: '28px 32px',
            boxShadow: 'var(--shadow-card)', maxWidth: 440, width: '90%',
            animation: 'protoFadeUp .2s ease',
          }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 18 }}>
              已支持规范列表
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {getSchoolOptions().map(s => (
                <div key={s.id} style={{
                  padding: '12px 0', borderBottom: '1px solid var(--hair)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: s.accent + '15', color: s.accent,
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{s.initial}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{s.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>{s.faculty} · {s.version}</div>
                    {s.sourceType === 'learned' && (
                      <div className="mono" style={{ fontSize: 9.5, color: 'var(--sun-600)', marginTop: 1 }}>自动学习</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono num" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{s.rules} 条</div>
                    {(uploadCountMap[s.id] || 0) > 0 && (
                      <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', marginTop: 1 }}>
                        {uploadCountMap[s.id]} 篇已上传
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSchoolModal(false)} style={{
              marginTop: 18, width: '100%', height: 36, border: 'none', borderRadius: 4,
              background: 'var(--ink-900)', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500,
            }}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step1Upload;
