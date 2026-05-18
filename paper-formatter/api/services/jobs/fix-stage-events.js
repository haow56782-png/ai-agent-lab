import { FIX_SUMMARIES, getFixArtifactDetailText, makeFixEvent } from "./fix-artifact-builder.js";
export function makePreparingEvent(eventContext) {
    return makeFixEvent({
        type: "stage",
        stage: "preparing",
        title: "修复任务已创建",
        detail: `已接收 ${eventContext.findingTotal} 个发现项，准备读取原稿。${eventContext.sourceContext.chapters[0] ? `已定位到章节：${eventContext.sourceContext.chapters[0]}` : ""}`,
        fixType: eventContext.fixType,
        finding_id: eventContext.sourceContext.findings[0]?.finding_id,
        related_finding_ids: eventContext.sourceContext.findings.slice(0, 3).map((finding) => finding.finding_id),
    });
}
export function makeDownloadingEvent(fixType) {
    return makeFixEvent({
        type: "stage",
        stage: "downloading",
        title: "原稿已读取",
        detail: "已从存储中读取原始 DOCX，下一步调用排版服务生成修复稿。",
        fixType,
    });
}
export function makeFormattingEvent(eventContext) {
    return makeFixEvent({
        type: "stage",
        stage: "formatting",
        title: "排版服务开始处理",
        detail: `正在按规则包写回 ${eventContext.findingTotal} 个发现项对应的版式修复。`,
        fixType: eventContext.fixType,
    });
}
export function makeArtifactEvent(fixType, artifact) {
    return makeFixEvent({
        type: "artifact",
        stage: `fixed:${fixType}`,
        title: FIX_SUMMARIES[fixType],
        detail: `${artifact.chapter ? `正在处理「${artifact.chapter}」。` : ""}${artifact.sourceSnippet ? `原稿片段：${artifact.sourceSnippet.slice(0, 72)}。` : ""}${getFixArtifactDetailText(fixType)}`,
        fixType,
        finding_id: artifact.finding_id,
        related_finding_ids: artifact.related_finding_ids,
    });
}
export function makeUploadingEvent() {
    return makeFixEvent({
        type: "stage",
        stage: "uploading",
        title: "正在保存修复稿",
        detail: "修复后的 DOCX 和差异报告正在写入存储，完成后即可进入逐页确认。",
    });
}
export function makeDoneEvent(isPassthrough) {
    return makeFixEvent({
        type: "stage",
        stage: "done",
        title: isPassthrough ? "修复完成（无更改）" : "修复稿已生成",
        detail: isPassthrough
            ? "当前文档格式不支持排版服务，已保留原稿不变。请将文档另存为 .docx 后再尝试修复。"
            : "真实 DOCX 与差异报告已经生成，可以进入逐页确认。",
    });
}
export function makeFailedEvent(errorMessage) {
    return makeFixEvent({
        type: "error",
        stage: "error",
        title: "修复任务失败",
        detail: errorMessage,
    });
}
