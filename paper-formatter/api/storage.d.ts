declare const BUCKETS: {
    readonly uploads: "paper-uploads";
    readonly outputs: "paper-outputs";
    readonly reports: "paper-reports";
};
export declare function ensureBuckets(): Promise<void>;
export declare function uploadFile(bucket: keyof typeof BUCKETS, key: string, buffer: Buffer, contentType?: string): Promise<string>;
export declare function downloadFile(bucket: keyof typeof BUCKETS, key: string): Promise<Buffer>;
export declare function deleteFile(bucket: keyof typeof BUCKETS, key: string): Promise<void>;
export declare function getObjectUrl(bucket: keyof typeof BUCKETS, key: string): string;
export declare function getStoragePath(bucket: keyof typeof BUCKETS, docId: string, filename: string): string;
export {};
