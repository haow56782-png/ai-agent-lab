/**
 * VIB AI — Mock Site Providers
 *
 * Simulates third-party game platform providers for demo and testing.
 * No real network calls — all data is in-memory.
 */
import type { SiteProvider, RecognizeResult, AuthorizeResult, AccountInfo, SignalResult } from "./types.js";
interface MockSite {
    domainPattern: RegExp;
    providerName: string;
    displayName: string;
    supportedGames: string[];
    mockAccount: AccountInfo;
    mockSignal: SignalResult["signal"];
}
export declare class MockSiteProvider implements SiteProvider {
    private site;
    private authDelayMs;
    private fetchDelayMs;
    readonly name: string;
    constructor(site: MockSite, authDelayMs?: number, fetchDelayMs?: number);
    recognize(_url: string): Promise<RecognizeResult>;
    authorize(_authCode: string): Promise<AuthorizeResult>;
    fetchAccount(_authToken: string): Promise<AccountInfo>;
    generateSignal(_account: AccountInfo): Promise<SignalResult>;
}
export declare class MockProviderManager {
    private providers;
    constructor();
    /** Recognize a site from its URL. Returns null if unsupported. */
    recognizeUrl(url: string): Promise<{
        provider: SiteProvider;
        result: RecognizeResult;
    } | null>;
    /** Get all known domain patterns (for display). */
    getKnownDomains(): string[];
}
export {};
//# sourceMappingURL=mock-provider.d.ts.map