export interface ShareReportRecord {
    share_id: string;
    file_id: string;
    check_result_id: string;
    source_job_id: string | null;
    doc_id: string | null;
    profile_id: string | null;
    payload_json: Record<string, any>;
    created_at: string;
}
export declare function createShareReport(record: {
    shareId: string;
    fileId: string;
    checkResultId: string;
    sourceJobId?: string | null;
    docId?: string | null;
    profileId?: string | null;
    payloadJson: Record<string, any>;
}): Promise<ShareReportRecord>;
export declare function getShareReport(shareId: string): Promise<ShareReportRecord | null>;
export declare function countShareStats(): Promise<{
    totalUsers: number;
    totalSchools: number;
}>;
