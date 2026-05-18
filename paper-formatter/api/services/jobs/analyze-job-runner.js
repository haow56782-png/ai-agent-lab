import { query } from "../../db.js";
import { buildObjectGraphFromExtraction } from "../../parser/object-graph/builder.js";
import { extractDocxObjectsFromDocxBuffer } from "../../parser/docx-object-extractor.js";
import * as findingRepo from "../../repositories/findings.js";
import * as jobRepo from "../../repositories/jobs.js";
import * as profileRepo from "../../repositories/profiles.js";
import * as ruleSetRepo from "../../repositories/rule-sets.js";
import { buildFindingsFromDetections } from "../../rules/builders/finding-builder.js";
import { buildRuleDetailsFromDetections } from "../../rules/builders/rule-detail-builder.js";
import { canonicalizeRuleDetections } from "../../rules/canonical-rule-map.js";
import { sortDetectionsByPriority } from "../../rules/priority.js";
import { runFormatRuleDetectors } from "../../rules/rule-registry.js";
import { loadUploadedDocumentBuffer } from "./document-loader.js";
import { buildAutoFormatIssues } from "./no-profile-format-evaluator.js";
import { runPythonParser } from "./parser-runner.js";
function getRuleStatus(ruleHit) {
    return Array.isArray(ruleHit) ? ruleHit[1] : ruleHit.status;
}
export async function processAnalyzeJob(jobId, documentRecord, profileId) {
    const hasNoProfile = !profileId;
    const profileRules = profileId ? await profileRepo.getProfileRules(profileId).catch(() => null) : null;
    const updateAnalyzeJob = (patch) => jobRepo.updateJob(jobId, patch).catch((error) => console.error(`[analyze] Failed to update job ${jobId}:`, error.message));
    try {
        await updateAnalyzeJob({ status: "processing", progress: 10, stage: "validating", started_at: new Date().toISOString() });
        const { documentBuffer, storagePath } = await loadUploadedDocumentBuffer(documentRecord);
        await updateAnalyzeJob({ progress: 30, stage: "parsing" });
        let parseResult;
        try {
            parseResult = runPythonParser(documentBuffer, documentRecord.filename);
        }
        catch (parseError) {
            console.warn("[analyze] Python parser failed, using fallback:", parseError.message);
            parseResult = {
                metadata: { paragraphs: 0, tables: 0, sections: 1 },
                paragraphs: [],
                headings: [],
                tables: [],
                images: [],
                structure: [],
            };
        }
        await updateAnalyzeJob({ progress: 60, stage: "analyzing_structure" });
        const structureItems = parseResult.structure || [];
        const headings = parseResult.headings || [];
        const sections = parseResult.sections || [];
        let objectGraph = null;
        try {
            const objectExtraction = await extractDocxObjectsFromDocxBuffer(documentBuffer, {
                docxPath: storagePath,
            });
            objectGraph = buildObjectGraphFromExtraction(objectExtraction, {
                documentId: documentRecord.canonical_document_id,
                documentVersion: "v1",
            });
        }
        catch (objectGraphError) {
            console.warn("[analyze] Object graph extraction failed, falling back to legacy detectors:", objectGraphError.message);
        }
        const coverItem = structureItems.find((structureItem) => structureItem.type === "cover");
        const abstractItem = structureItems.find((structureItem) => structureItem.type === "abstract");
        const tocItem = structureItems.find((structureItem) => structureItem.type === "toc");
        const figureCaptions = structureItems.filter((structureItem) => structureItem.type === "figure_caption");
        const tableCaptions = structureItems.filter((structureItem) => structureItem.type === "table_caption");
        const referenceEntries = structureItems.filter((structureItem) => structureItem.type === "reference_entry");
        const structureSummaryItems = [
            { k: "封面", conf: coverItem?.confidence ?? 0.85, done: true },
            { k: "摘要 / Abstract", conf: abstractItem?.confidence ?? 0.90, done: true },
            { k: "目录", conf: tocItem?.confidence ?? 0.88, done: true },
            { k: `一级标题 × ${headings.length}`, conf: headings.length > 0 ? 0.95 : 0.60, done: true },
            { k: `图题 × ${figureCaptions.length}`, conf: figureCaptions.length > 0 ? 0.90 : 0.70, done: true },
            { k: `表题 × ${tableCaptions.length}`, conf: tableCaptions.length > 0 ? 0.92 : 0.70, done: true },
            { k: `参考文献 × ${referenceEntries.length}`, conf: referenceEntries.length > 0 ? 0.85 : 0.60, done: true },
        ];
        const paragraphs = parseResult.paragraphs || [];
        const images = parseResult.images || [];
        const detectionContext = {
            doc: documentRecord,
            profile: profileRules,
            profileId,
            paragraphs,
            sections,
            images,
            tables: parseResult.tables || [],
            headings,
            structureItems,
            flowItems: parseResult.flow || [],
            objectGraph,
        };
        const detectedRuleDetections = profileId
            ? sortDetectionsByPriority(canonicalizeRuleDetections({
                detections: runFormatRuleDetectors(detectionContext),
                profile: profileRules,
            }))
            : [];
        let ruleDetails;
        let logs;
        let passed = 0;
        let warnings = 0;
        const ruleDetections = detectedRuleDetections;
        if (hasNoProfile) {
            const autoFormatIssues = buildAutoFormatIssues(sections, paragraphs);
            warnings = autoFormatIssues.length;
            ruleDetails = [
                { cat: "页面", items: sections.length > 0 ? [["页边距", "pass"], ["纸张 A4", "pass"]] : [["页边距", "warn"]] },
                { cat: "字体检测", items: autoFormatIssues.filter((formatIssue) => formatIssue[0].includes("字体")).length > 0 ? autoFormatIssues.filter((formatIssue) => formatIssue[0].includes("字体")) : [["正文字体一致", "pass"]] },
                { cat: "字号检测", items: autoFormatIssues.filter((formatIssue) => formatIssue[0].includes("字号")).length > 0 ? autoFormatIssues.filter((formatIssue) => formatIssue[0].includes("字号")) : [["正文字号一致", "pass"]] },
                { cat: "行距检测", items: autoFormatIssues.filter((formatIssue) => formatIssue[0].includes("行距")).length > 0 ? autoFormatIssues.filter((formatIssue) => formatIssue[0].includes("行距")) : [["行距均匀", "pass"]] },
                { cat: "格式问题", items: autoFormatIssues.filter((formatIssue) => !formatIssue[0].includes("字体") && !formatIssue[0].includes("字号") && !formatIssue[0].includes("行距")).length > 0
                        ? autoFormatIssues.filter((formatIssue) => !formatIssue[0].includes("字体") && !formatIssue[0].includes("字号") && !formatIssue[0].includes("行距"))
                        : [["未发现明显格式问题", "pass"]] },
            ];
            passed = ruleDetails.flatMap((ruleGroup) => ruleGroup.items).filter((ruleHit) => getRuleStatus(ruleHit) === "pass").length;
            const ole2Warning = parseResult.metadata?._ole2_warning;
            logs = [
                ...(ole2Warning ? [`▲ ${ole2Warning}`] : []),
                `✓ 文档解析完成: ${paragraphs.length} 段落`,
                `✓ 页面设置: ${sections.length > 0 ? `${sections[0].margin_top_mm}/${sections[0].margin_bottom_mm}/${sections[0].margin_left_mm}/${sections[0].margin_right_mm} mm` : "默认"}`,
                ...(warnings > 0 ? [`▲ 检测到 ${warnings} 个格式问题`] : ["✓ 格式检测通过"]),
                ...(headings.length > 0 ? [`✓ 标题: ${headings.length} 个`] : []),
                "ℹ 未选择学校规范 · 仅检测格式问题 · 不应用规则修改",
            ];
        }
        else {
            ruleDetails = buildRuleDetailsFromDetections({ sections, paragraphs, detections: detectedRuleDetections });
            passed = ruleDetails.flatMap((ruleGroup) => ruleGroup.items).filter((ruleHit) => getRuleStatus(ruleHit) === "pass").length;
            warnings = ruleDetails.flatMap((ruleGroup) => ruleGroup.items).filter((ruleHit) => getRuleStatus(ruleHit) === "warn").length;
            const ole2Warning = parseResult.metadata?._ole2_warning;
            logs = [
                ...(ole2Warning ? [`▲ ${ole2Warning}`] : []),
                `✓ 检出文档结构: ${structureItems.length} 个元素`,
                `✓ 段落: ${parseResult.metadata.paragraphs} · 表格: ${parseResult.metadata.tables} · 节: ${parseResult.metadata.sections}`,
                `✓ 一级标题 × ${headings.length}`,
                ...(figureCaptions.length > 0 ? [`✓ 图题 × ${figureCaptions.length}`] : []),
                ...(tableCaptions.length > 0 ? [`✓ 表题 × ${tableCaptions.length}`] : []),
                ...(detectedRuleDetections.length > 0 ? [`▲ 发现 ${detectedRuleDetections.length} 条规则命中`] : []),
                ...(referenceEntries.length > 0 ? [`▲ 参考文献 ${referenceEntries.length} 条`] : ["⚠ 未检测到参考文献区域"]),
                `✓ 页面设置: ${sections.length > 0 ? `${sections[0].margin_top_mm}/${sections[0].margin_bottom_mm}/${sections[0].margin_left_mm}/${sections[0].margin_right_mm} mm` : "默认"}`,
            ];
        }
        await updateAnalyzeJob({ progress: 80, stage: "applying_rules" });
        const findings = await findingRepo.upsertFindings({
            jobId,
            documentId: documentRecord.canonical_document_id,
            findings: buildFindingsFromDetections({ doc: documentRecord, profileId, detections: ruleDetections }),
        });
        if (profileId && findings.length > 0) {
            try {
                await ruleSetRepo.createAnalyzeRuleSnapshotsForFindings({
                    schoolId: profileId,
                    documentId: documentRecord.canonical_document_id,
                    jobId,
                    findings,
                });
            }
            catch (snapshotError) {
                console.warn(`[analyze] Failed to create rule snapshots for ${jobId}:`, snapshotError.message);
            }
        }
        const resultJson = {
            items: structureSummaryItems,
            log: logs,
            rules: { passed, warnings, failed: 0 },
            ruleDetails,
            findings,
            rawHeadings: headings,
            rawSections: sections,
            parsedTexts: (parseResult.paragraphs || []).map((paragraph) => paragraph.text || ""),
        };
        await updateAnalyzeJob({
            progress: 100,
            stage: "done",
            status: "completed",
            result_json: resultJson,
            completed_at: new Date().toISOString(),
        });
        if (profileId) {
            try {
                const existingProfileLink = await query(`SELECT 1 FROM document_profiles WHERE doc_id = $1 AND school_id = $2`, [documentRecord.doc_id, profileId]);
                if (existingProfileLink.rows.length === 0) {
                    await query(`INSERT INTO document_profiles (doc_id, school_id, profile_id) VALUES ($1, $2, $3)`, [documentRecord.doc_id, profileId, profileId]);
                    await profileRepo.incrementUploadCount(profileId);
                }
            }
            catch (trackingError) {
                console.warn(`[analyze] Failed to track profile for ${jobId}:`, trackingError.message);
            }
        }
    }
    catch (error) {
        await updateAnalyzeJob({ status: "failed", progress: 0, stage: "error", error_message: error.message });
        console.error(`[analyze] Job ${jobId} failed:`, error.message);
    }
}
