/**
 * VIB AI — Mock Site Providers
 *
 * Simulates third-party game platform providers for demo and testing.
 * No real network calls — all data is in-memory.
 */

import type {
  SiteProvider,
  RecognizeResult,
  AuthorizeResult,
  AccountInfo,
  SignalResult,
} from "./types.js";

// ─── Known sites ───────────────────────────────────

interface MockSite {
  domainPattern: RegExp;
  providerName: string;
  displayName: string;
  supportedGames: string[];
  mockAccount: AccountInfo;
  mockSignal: SignalResult["signal"];
}

const MOCK_SITES: MockSite[] = [
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

export class MockSiteProvider implements SiteProvider {
  readonly name: string;

  constructor(
    private site: MockSite,
    private authDelayMs = 800,
    private fetchDelayMs = 600,
  ) {
    this.name = site.providerName;
  }

  async recognize(_url: string): Promise<RecognizeResult> {
    return {
      supported: true,
      siteDomain: this.site.domainPattern.source.replace(/\\/g, "").replace(/\/i/g, ""),
      providerName: this.site.providerName,
      displayName: this.site.displayName,
      supportedGames: [...this.site.supportedGames],
    };
  }

  async authorize(_authCode: string): Promise<AuthorizeResult> {
    await sleep(this.authDelayMs);
    return { success: true, authToken: `mock_token_${this.site.providerName}_${Date.now()}` };
  }

  async fetchAccount(_authToken: string): Promise<AccountInfo> {
    await sleep(this.fetchDelayMs);
    return { ...this.site.mockAccount };
  }

  async generateSignal(_account: AccountInfo): Promise<SignalResult> {
    await sleep(400);
    if (this.site.mockSignal) {
      return { success: true, signal: { ...this.site.mockSignal } };
    }
    return { success: false, error: "Signal generation failed: no data available" };
  }
}

// ─── Provider Manager ──────────────────────────────

export class MockProviderManager {
  private providers = new Map<string, SiteProvider>();

  constructor() {
    for (const site of MOCK_SITES) {
      this.providers.set(site.providerName, new MockSiteProvider(site));
    }
  }

  /** Recognize a site from its URL. Returns null if unsupported. */
  async recognizeUrl(url: string): Promise<{
    provider: SiteProvider;
    result: RecognizeResult;
  } | null> {
    for (const site of MOCK_SITES) {
      if (site.domainPattern.test(url)) {
        const provider = this.providers.get(site.providerName)!;
        const result = await provider.recognize(url);
        return { provider, result };
      }
    }
    return null;
  }

  /** Get all known domain patterns (for display). */
  getKnownDomains(): string[] {
    return MOCK_SITES.map(
      (s) => s.displayName,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
