export interface DiffConfirmationProgressInput {
  total: number;
  acceptedCount: number;
  rejectedCount: number;
}

export function getDiffConfirmationProgress({
  total,
  acceptedCount,
  rejectedCount,
}: DiffConfirmationProgressInput) {
  const confirmedCount = Math.min(Math.max(acceptedCount + rejectedCount, 0), Math.max(total, 0));
  const ratio = total > 0 ? confirmedCount / total : 0;
  return {
    confirmedCount,
    ratio,
    percent: Math.round(ratio * 100),
  };
}
