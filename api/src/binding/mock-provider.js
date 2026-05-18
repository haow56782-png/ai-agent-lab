/**
 * VIB AI — Mock Site Providers
 *
 * Simulates third-party game platform providers for demo and testing.
 * No real network calls — all data is in-memory.
 */
const MOCK_SITES = [
    {
        domainPattern: /pgsoft\.com/i,
        providerName: "PG_SOFT",
        displayName: "PG Soft",
        supportedGames: ["Gem Saviour", "Treasure Bowl", "Hood vs Wolf"],
        mockAccount: {
            platformUserId: "pg_user_001",
            nickname: "LuckyPlayer",
            avatar: "https://pgsoft.com/avatars/default.png",
            gameAccountId: "pg_acc_abc123",
        },
        mockSignal: {
            confidence: 0.82,
            prediction: "PG_SOFT: Gem Saviour — high volatility expected in next 24h",
            factors: ["Historical win rate: 34%", "Current streak: 3 losses", "Tournament active"],
        },
    },
    {
        domainPattern: /jili\.com/i,
        providerName: "JILI",
        displayName: "JILI Games",
        supportedGames: ["Super Ace", "Golden Empire", "Fortune Gems"],
        mockAccount: {
            platformUserId: "jili_user_042",
            nickname: "SlotMaster",
            avatar: "https://jili.com/avatars/default.png",
            gameAccountId: "jili_acc_xyz789",
        },
        mockSignal: {
            confidence: 0.75,
            prediction: "JILI: Super Ace — moderate win probability, hold strategy recommended",
            factors: ["RTP: 96.5%", "Recent payout ratio: above average", "Player level: VIP 3"],
        },
    },
    {
        domainPattern: /spadegaming\.com/i,
        providerName: "SPADE_GAMING",
        displayName: "Spade Gaming",
        supportedGames: ["Dragon Tiger", "Baccarat Pro", "Sic Bo"],
        mockAccount: {
            platformUserId: "spade_user_017",
            nickname: "CardShark",
            avatar: "https://spadegaming.com/avatars/default.png",
            gameAccountId: "spade_acc_def456",
        },
        mockSignal: {
            confidence: 0.68,
            prediction: "SPADE_GAMING: Dragon Tiger — trend shows Dragon bias, bet Dragon",
            factors: ["Last 10 rounds: Dragon won 7", "Deck penetration: 60%", "Player trend: chasing Dragon"],
        },
    },
];
// ─── Mock Provider ─────────────────────────────────
export class MockSiteProvider {
    site;
    authDelayMs;
    fetchDelayMs;
    name;
    constructor(site, authDelayMs = 800, fetchDelayMs = 600) {
        this.site = site;
        this.authDelayMs = authDelayMs;
        this.fetchDelayMs = fetchDelayMs;
        this.name = site.providerName;
    }
    async recognize(_url) {
        return {
            supported: true,
            siteDomain: this.site.domainPattern.source.replace(/\\/g, "").replace(/\/i/g, ""),
            providerName: this.site.providerName,
            displayName: this.site.displayName,
            supportedGames: [...this.site.supportedGames],
        };
    }
    async authorize(_authCode) {
        await sleep(this.authDelayMs);
        return { success: true, authToken: `mock_token_${this.site.providerName}_${Date.now()}` };
    }
    async fetchAccount(_authToken) {
        await sleep(this.fetchDelayMs);
        return { ...this.site.mockAccount };
    }
    async generateSignal(_account) {
        await sleep(400);
        if (this.site.mockSignal) {
            return { success: true, signal: { ...this.site.mockSignal } };
        }
        return { success: false, error: "Signal generation failed: no data available" };
    }
}
// ─── Provider Manager ──────────────────────────────
export class MockProviderManager {
    providers = new Map();
    constructor() {
        for (const site of MOCK_SITES) {
            this.providers.set(site.providerName, new MockSiteProvider(site));
        }
    }
    /** Recognize a site from its URL. Returns null if unsupported. */
    async recognizeUrl(url) {
        for (const site of MOCK_SITES) {
            if (site.domainPattern.test(url)) {
                const provider = this.providers.get(site.providerName);
                const result = await provider.recognize(url);
                return { provider, result };
            }
        }
        return null;
    }
    /** Get all known domain patterns (for display). */
    getKnownDomains() {
        return MOCK_SITES.map((s) => s.displayName);
    }
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=mock-provider.js.map