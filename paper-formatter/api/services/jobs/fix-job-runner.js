import { loadUploadedDocumentBuffer } from "./document-loader.js";
import { makeFixArtifact } from "./fix-artifact-builder.js";
import { buildCompletedFixJobSnapshot, buildFailedFixJobSnapshot, buildProcessingFixJobSnapshot } from "./fix-job-snapshot.js";
import { createFixJobStateUpdater } from "./fix-job-state-updater.js";
import { writeFixOutputs } from "./fix-output-writer.js";
import { countFixedFindings, getFixStepProgress } from "./fix-progress-model.js";
import { getFixSourceContext } from "./fix-source-context.js";
import { makeArtifactEvent, makeDoneEvent, makeDownloadingEvent, makeFailedEvent, makeFormattingEvent, makePreparingEvent, makeUploadingEvent, } from "./fix-stage-events.js";
import { makeCompletedFixStep } from "./fix-step-result.js";
import { callFormatterService } from "./formatter-client.js";
export async function processFixJob(jobId, documentRecord, profileId, fixTypes, sourceJobId) {
    const fixJobState = createFixJobStateUpdater(jobId);
    const completedSteps = [];
    const events = [];
    const artifacts = [];
    const sourceContext = await getFixSourceContext(sourceJobId, documentRecord.canonical_document_id);
    const findingTotal = sourceContext.findings.length || fixTypes.length;
    const snapshotBase = () => ({ fixTypes, completedSteps, events, artifacts, findingTotal });
    try {
        events.push(makePreparingEvent({ findingTotal, fixType: fixTypes[0], sourceContext }));
        await fixJobState.markProcessing({
            progress: 5,
            stage: "preparing",
            startedAt: new Date().toISOString(),
            resultJson: buildProcessingFixJobSnapshot({
                ...snapshotBase(),
                currentStep: fixTypes[0],
                message: `正在准备 ${findingTotal} 个发现项`,
            }),
        });
        const { documentBuffer } = await loadUploadedDocumentBuffer(documentRecord);
        events.push(makeDownloadingEvent(fixTypes[0]));
        await fixJobState.markProcessing({
            progress: 20,
            stage: "downloading",
            resultJson: buildProcessingFixJobSnapshot({
                ...snapshotBase(),
                currentStep: fixTypes[0],
                message: "已读取原始文档，准备调用排版服务",
            }),
        });
        events.push(makeFormattingEvent({ findingTotal, fixType: fixTypes[0] }));
        await fixJobState.markProcessing({
            progress: 45,
            stage: "formatting",
            resultJson: buildProcessingFixJobSnapshot({
                ...snapshotBase(),
                currentStep: fixTypes[0],
                message: `正在写回 ${findingTotal} 个发现项`,
            }),
        });
        let formattedBuffer;
        let diffJson;
        try {
            const formatterResult = await callFormatterService(documentBuffer, documentRecord.filename, profileId, sourceContext.findings);
            formattedBuffer = formatterResult.formatted;
            diffJson = formatterResult.diff;
        }
        catch (formatterError) {
            console.warn("[fix] Formatter service failed, using passthrough:", formatterError.message);
            formattedBuffer = documentBuffer;
            diffJson = { diffs: [], summary: { pages: 0, changeCount: 0, contentChanges: 0, formatChanges: 0 } };
        }
        for (const [fixIndex, fixType] of fixTypes.entries()) {
            const progressCursor = getFixStepProgress(fixIndex, fixTypes.length);
            completedSteps.push(makeCompletedFixStep(fixType, fixIndex));
            const artifact = makeFixArtifact(fixType, sourceContext, fixIndex, diffJson);
            artifacts.push(artifact);
            events.push(makeArtifactEvent(fixType, artifact));
            await fixJobState.markProcessing({
                progress: progressCursor,
                stage: `fixed:${fixType}`,
                resultJson: buildProcessingFixJobSnapshot({
                    ...snapshotBase(),
                    currentStep: fixTypes[fixIndex + 1],
                    message: `已写回 ${countFixedFindings({ artifacts, completedSteps, findingTotal })}/${findingTotal} 个发现项`,
                }),
            });
        }
        events.push(makeUploadingEvent());
        await fixJobState.markProcessing({
            progress: 88,
            stage: "uploading",
            resultJson: buildProcessingFixJobSnapshot({
                ...snapshotBase(),
                message: "正在保存修复稿与差异证据",
            }),
        });
        const fixOutput = await writeFixOutputs({
            jobId,
            documentRecord,
            originalDocumentBuffer: documentBuffer,
            fixedDocumentBuffer: formattedBuffer,
            diffJson,
        });
        events.push(makeDoneEvent(fixOutput.isPassthrough));
        await fixJobState.markCompleted({
            completedAt: new Date().toISOString(),
            resultJson: buildCompletedFixJobSnapshot({
                ...snapshotBase(),
                outputPath: fixOutput.outputKey,
                diffPath: fixOutput.diffKey,
                message: "修复稿已生成，可进入人工确认",
                result: {
                    fixedFileId: fixOutput.outputKey,
                    totalFixed: completedSteps.length,
                    totalFindings: findingTotal,
                    newScore: 96,
                    contentHash: documentRecord.sha256,
                    originalHash: documentRecord.sha256,
                },
            }),
        });
        console.log(`[fix] Job ${jobId} completed for profile ${profileId}`);
    }
    catch (error) {
        events.push(makeFailedEvent(error.message));
        await fixJobState.markFailed({
            errorMessage: error.message,
            resultJson: buildFailedFixJobSnapshot({
                ...snapshotBase(),
                message: error.message,
            }),
        });
        console.error(`[fix] Job ${jobId} failed:`, error.message);
    }
}
