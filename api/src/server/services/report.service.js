/**
 * Report Service — creates and retrieves analysis reports.
 *
 * Billing note (charging point 3):
 * Report generation charging trigger is TBD. Two options:
 *   A) Charge at task COMPLETED (state machine lock, alongside signal).
 *   B) Charge on a dedicated report endpoint (idempotency-key required).
 * Currently does NOT charge. See task.service.ts for full billing architecture.
 */
let reportCounter = 0;
function generateReportId() {
    reportCounter++;
    return `report_${Date.now().toString(36)}_${reportCounter}`;
}
export async function createReportForTask(taskId, taskStore, reportStore) {
    const task = await taskStore.getTask(taskId);
    if (!task || !task.result)
        return undefined;
    const now = new Date().toISOString();
    const report = {
        reportId: generateReportId(),
        taskId: task.taskId,
        summary: `Analysis report for ${task.url}`,
        findings: [task.result.slice(0, 300)],
        createdAt: now,
    };
    return reportStore.createReport(report);
}
export async function getReport(reportId, reportStore) {
    return reportStore.getReport(reportId);
}
//# sourceMappingURL=report.service.js.map