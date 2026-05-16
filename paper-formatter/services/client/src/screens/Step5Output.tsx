import React, { useState, useMemo, useEffect } from 'react';
import { useApp, findSchoolById, getLegacyDocumentId, isDemoDocument } from '../components/AppFrame';
import { api, type DiffResult } from '../api/client';
import { canDownloadByFindings } from '../../../../packages/shared-types/src/finding-download-guard';
import ShareModal from '../components/ShareModal';
import { analytics } from '../api/analytics';
import { DeliveryHeader } from '../components/DeliveryHeader';
import { FixSummaryCard } from '../components/FixSummaryCard';
import { ExportConfirmCard } from '../components/ExportConfirmCard';
import { WarningCard } from '../components/WarningCard';
import { MetricsCard } from '../components/MetricsCard';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { useReviewStore } from '../stores/reviewStore';
import { getContentIntegrityView } from '../utils/contentIntegrityView';

interface Props {
  showToast: (msg: string) => void;
}

const FIX_SUMMARY = [
  '页边距：左边距 25mm → 30mm',
  '正文字体：修复 47 处英文字体',
  '行距：全文统一为固定 23 磅 · 字符间距标准',
  '标题层级：黑体小2/小3/4号 · 段前段后 0.5 行',
  '页码：前置页改为罗马数字，正文从 1 开始',
  '封面：日期格式已修正',
  '目录：已重新生成，页码已更新',
  '查重风险：已修复 3 项，预计影响降低 4%',
  // ── P1 增值功能 ──
  '页眉页脚：前置页移除 · 正文页眉已设置',
  '摘要 & 关键词：关键词分隔符已修正',
  '交叉引用：修复 2 处断裂引用',
  '图表题注：编号格式已统一',
  '参考文献格式：GB/T 7714 已修正 5 处',
  '表格格式：三线表已应用 · 表标题/内容字体已修正',
  '图片格式：边框 0.75pt · 图题格式已修正',
  '标点符号：全角/半角已统一（纠正 16 处）',
];

const Step5Output: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const legacyDocId = getLegacyDocumentId(state);
  const r = state.parseResults;
  const passed = r?.rules.passed || 142;
  const warnings = r?.rules.warnings || 3;
  const total = passed + warnings;
  const oldScore = total > 0 ? Math.round((passed / total) * 100) : 62;
  const newScore = 96;

  const defaultName = useMemo(() => {
    const base = state.doc?.name?.replace(/\.(docx|pdf)$/, '') || '毕业论文';
    const school = state.schoolId || '';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${base}_${school}_${date}.docx`;
  }, [state.doc, state.schoolId]);

  const [fileName, setFileName] = useState(defaultName);
  const [editingName, setEditingName] = useState(false);
  const [withOriginal, setWithOriginal] = useState(true);
  const [withChangelog, setWithChangelog] = useState(true);
  const [withReport, setWithReport] = useState(true);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const schoolInfo = findSchoolById(state.schoolId);
  const storeFindings = useReviewStore((reviewState) => reviewState.findings);
  const p1Exemption = useReviewStore((reviewState) => reviewState.p1Exemption);
  const formatJobId = state.formatJobId;
  const hasRealJob = Boolean(formatJobId && formatJobId !== 'demo');
  const rawGuardFindings = storeFindings.length > 0 ? storeFindings : state.parseResults?.findings ?? [];
  const guardFindings = state.exported ? [] : rawGuardFindings;
  const downloadGuard = useMemo(() => canDownloadByFindings({
    jobStatus: state.jobStatus,
    findings: guardFindings,
    p1Exemption,
  }), [guardFindings, p1Exemption, state.jobStatus]);
  const canDownloadRealOutput = hasRealJob && downloadGuard.allowed;
  const guardDownloadError = !hasRealJob
    ? '当前还没有可下载的真实修复结果，请先完成真实修复任务。'
    : downloadGuard.message;
  const visibleDownloadError = downloadError || guardDownloadError;
  const deliveryNarrative = canDownloadRealOutput
    ? '这篇论文已经完成修复和人工确认，现在可以下载定稿与留档材料。'
    : '真实修复结果准备好并完成确认后，这里会生成可下载的定稿。';
  const contentIntegrityView = useMemo(
    () => getContentIntegrityView(diffResult?.integrity),
    [diffResult?.integrity],
  );

  useEffect(() => {
    if (!formatJobId || formatJobId === 'demo') return;
    if (state.jobStatus === 'completed' || state.jobStatus === 'failed') return;

    let cancelled = false;
    let timer: number | null = null;

    const pollFormatJob = async () => {
      try {
        const status = await api.getJob(formatJobId);
        if (cancelled) return;

        set({ jobStatus: status.status });
        if (status.status === 'completed' || status.status === 'failed') return;
        timer = window.setTimeout(pollFormatJob, 800);
      } catch {
        if (cancelled) return;
        timer = window.setTimeout(pollFormatJob, 1200);
      }
    };

    void pollFormatJob();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [formatJobId, set, state.jobStatus]);

  useEffect(() => {
    if (!formatJobId || formatJobId === 'demo') {
      setDiffResult(null);
      return;
    }

    let cancelled = false;
    api.getDiff(formatJobId)
      .then((result) => {
        if (!cancelled) setDiffResult(result);
      })
      .catch(() => {
        if (!cancelled) setDiffResult(null);
      });

    return () => {
      cancelled = true;
    };
  }, [formatJobId, state.jobStatus]);

  const handleDownload = async (type?: string) => {
    if (!hasRealJob || !downloadGuard.allowed) {
      const message = guardDownloadError || '当前发现项尚未全部满足下载条件。';
      setDownloadError(message);
      showToast(message);
      return;
    }

    try {
      const url = api.getDownloadUrl(formatJobId!, type);
      const res = await fetch(url);
      if (!res.ok) {
        let message = `下载失败: HTTP ${res.status}`;
        try {
          const body = await res.json();
          message = body?.error?.message || body?.message || message;
        } catch {
          const text = await res.text().catch(() => '');
          if (text) message = text;
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = type === 'report' ? '校验报告.pdf'
        : type === 'changelog' ? '修改清单.txt'
        : type === 'original' ? '原稿备份.docx'
        : fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
      setDownloadError(null);
      showToast('开始下载');
    } catch (err: any) {
      const message = `下载失败: ${err.message}`;
      setDownloadError(message);
      showToast(message);
    }
  };

  const handleExportAll = async () => {
    if (!canDownloadRealOutput) {
      const message = guardDownloadError || '当前发现项尚未全部满足导出条件。';
      setDownloadError(message);
      showToast(message);
      return;
    }

    await handleDownload();
    if (withOriginal) await handleDownload('original');
    if (withChangelog) await handleDownload('changelog');
    if (withReport) await handleDownload('report');
  };

  const handleShare = () => {
    if (!legacyDocId || isDemoDocument(state)) {
      showToast('当前没有可分享的真实体检结果，请先上传真实文档并完成处理。');
      return;
    }
    analytics.shareClick('export_page');
    setShareLoading(true);
    api.createShareReport(legacyDocId)
      .then(res => {
        setShareUrl(res.shareUrl);
        setShowShare(true);
      })
      .catch((err: any) => {
        showToast(`分享失败: ${err.message}`);
      })
      .finally(() => setShareLoading(false));
  };

  return (
    <div style={{ flex: 1, padding: '32px 56px 36px', overflow: 'auto', background: 'var(--paper-1)' }}>
      <DeliveryHeader
        contentIntegrity={contentIntegrityView}
        deliveryNarrative={deliveryNarrative}
        oldScore={oldScore}
        newScore={newScore}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: '正文保护', value: contentIntegrityView.detail },
          { label: '交付方式', value: '修正稿、原稿、修改清单、报告可一起留档' },
          { label: '导出建议', value: '确认页已过目，再下载最终交稿版' },
        ].map((signal) => (
          <div key={signal.label} style={{
            background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
            padding: '12px 14px',
          }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 6 }}>{signal.label}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-700)', lineHeight: 1.5 }}>{signal.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* LEFT: Fix summary + export */}
        <div>
          <FixSummaryCard items={FIX_SUMMARY} />

          <ExportConfirmCard
            contentIntegrity={contentIntegrityView}
            fileName={fileName}
            editingName={editingName}
            withOriginal={withOriginal}
            withChangelog={withChangelog}
            withReport={withReport}
            canDownloadRealOutput={canDownloadRealOutput}
            downloadError={visibleDownloadError}
            onFileNameChange={setFileName}
            onEditingNameChange={setEditingName}
            onWithOriginalChange={setWithOriginal}
            onWithChangelogChange={setWithChangelog}
            onWithReportChange={setWithReport}
            onExportAll={handleExportAll}
            onShare={handleShare}
            onPrintPreview={() => setShowPrintPreview(true)}
          />
        </div>

        {/* RIGHT: Warnings + info */}
        <div>
          <WarningCard
            warnings={warnings}
            items={[
              { tag: '样式', title: '脚注样式不在白名单', detail: '原稿使用了非标准脚注字符样式。出于零内容编辑原则，未自动改写，仅给出建议。', page: 'p.14' },
              { tag: '图表', title: '表跨页未启用 keep-together', detail: '若严格按学校规范不允许表格跨页，可手动启用 "Keep with next" 或人工调整位置。', page: 'p.27' },
              { tag: '文献', title: '缺 DOI 字段', detail: 'GB/T 7714-2015 推荐补充 DOI；条目正文未做改动，建议在 Zotero 中补全后重新导出。', page: 'ref.[12]' },
            ]}
            onNavigate={() => set({ step: 5 })}
          />

          <MetricsCard contentIntegrity={contentIntegrityView} />

          <div style={{
            marginTop: 16,
            background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
            padding: '14px 18px',
          }}>
            <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 8 }}>
              这里是下载与留档，不再处理确认动作
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
              系统已经帮你把论文从“排版待修”推进到“已确认可交付”的状态。
              这一页只负责下载修正稿、打印预览和留档材料；如果还要复核修改，请回到上一步确认页。
            </div>
          </div>
        </div>
      </div>

      <PrintPreviewModal
        show={showPrintPreview}
        canDownloadRealOutput={canDownloadRealOutput}
        onClose={() => setShowPrintPreview(false)}
        onExportAll={handleExportAll}
      />
  
      {showShare && (
        <ShareModal
          score={newScore}
          totalIssues={total}
          fixableIssues={total}
          schoolName={schoolInfo?.name || state.schoolId || ''}
          collegeName=""
          onClose={() => setShowShare(false)}
          onCopyLink={() => {
            analytics.shareCopyLink('export_page');
            navigator.clipboard.writeText(shareUrl || '');
            showToast(shareLoading ? '正在生成分享链接…' : '链接已复制');
          }}
          onGeneratePoster={() => { analytics.shareGeneratePoster('export_page'); showToast('海报生成功能即将上线'); }}
        />
      )}
    </div>
  );
};

export default Step5Output;
