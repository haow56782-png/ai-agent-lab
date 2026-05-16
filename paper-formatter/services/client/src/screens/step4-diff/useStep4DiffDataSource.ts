import { useEffect, useState } from 'react';
import type { DiffResult, FindingContract } from '../../api/client';
import { api } from '../../api/client';

interface Step4DiffDataSourceInput {
  analyzeJobId: string | null;
  formatJobId: string | null;
  canonicalDocumentId: string | null;
  parseResultFindingCount: number;
  showToast: (message: string) => void;
}

export function useStep4DiffDataSource({
  analyzeJobId,
  formatJobId,
  canonicalDocumentId,
  parseResultFindingCount,
  showToast,
}: Step4DiffDataSourceInput) {
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [serverFindings, setServerFindings] = useState<FindingContract[]>([]);

  useEffect(() => {
    setDiffResult(null);
  }, [formatJobId]);

  useEffect(() => {
    if (!formatJobId || formatJobId === 'demo' || diffResult) return;
    api.getDiff(formatJobId)
      .then(setDiffResult)
      .catch(() => {
        showToast('批改结果加载出了点问题，请稍后重试。');
      });
  }, [diffResult, formatJobId, showToast]);

  useEffect(() => {
    setServerFindings([]);
  }, [analyzeJobId, canonicalDocumentId]);

  useEffect(() => {
    if (!canonicalDocumentId || !analyzeJobId || analyzeJobId === 'demo' || parseResultFindingCount > 0) return;
    let cancelled = false;
    api.listFindings({ canonicalDocumentId, analyzeJobId })
      .then((findings) => {
        if (!cancelled) setServerFindings(findings);
      })
      .catch(() => {
        showToast('发现项读取暂时失败，将使用本地解析结果继续确认。');
      });
    return () => {
      cancelled = true;
    };
  }, [analyzeJobId, canonicalDocumentId, parseResultFindingCount, showToast]);

  return {
    diffResult,
    serverFindings,
  };
}
