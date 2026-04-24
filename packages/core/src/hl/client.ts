const HL_API_BASE = "https://api.hyperliquid.xyz";

export type HLInfoRequest =
  | { type: "allMids" }
  | { type: "clearinghouseState"; user: string }
  | { type: "metaAndAssetCtxs" }
  | { type: "userFills"; user: string }
  | { type: "userFunding"; user: string; startTime: number }
  | { type: "l2Book"; coin: string }
  | { type: "vaultDetails"; vaultAddress: string }
  | {
      type: "candleSnapshot";
      req: { coin: string; interval: string; startTime: number; endTime: number };
    };

export interface HLAssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
}

export interface HLAssetCtx {
  funding: string;
  openInterest: string;
  dayNtlVlm: string;
  midPx: string | null;
  markPx: string;
  premium: string | null;
  oraclePx: string;
  prevDayPx: string;
  impactPxs?: [string, string] | null;
}

export type HLMetaAndAssetCtxs = [{ universe: HLAssetMeta[] }, HLAssetCtx[]];

export interface HLL2Level {
  px: string;
  sz: string;
  n: number;
}

export interface HLL2Book {
  coin: string;
  time: number;
  levels: [HLL2Level[], HLL2Level[]];
}

export interface HLUserFill {
  coin: string;
  px: string;
  sz: string;
  side: "B" | "A";
  time: number;
  closedPnl: string;
  hash: string;
  dir?: string;
  startPosition?: string;
}

export interface HLCandle {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
}

export interface HLFundingEvent {
  time: number;
  coin: string;
  usdc: string;
  szi: string;
  fundingRate: string;
}

export interface HLLeaderboardRow {
  ethAddress: string;
  accountValue: string;
  windowPerformances: Array<[string, { pnl: string; roi: string; vlm: string }]>;
  prize?: number;
  displayName?: string | null;
}

export interface HLAssetPosition {
  position: {
    coin: string;
    entryPx: string;
    leverage: { type: "cross" | "isolated"; value: number; rawUsd?: string };
    liquidationPx: string | null;
    marginUsed: string;
    maxLeverage: number;
    positionValue: string;
    returnOnEquity: string;
    szi: string;
    unrealizedPnl: string;
  };
  type: "oneWay";
}

export interface HLClearinghouseState {
  assetPositions: HLAssetPosition[];
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  time: number;
  withdrawable: string;
}

export type HLAllMids = Record<string, string>;

export interface HLVaultDetails {
  name: string;
  vaultAddress: string;
  leader: string;
  description: string;
  portfolio: unknown;
  apr: number;
  followerState: unknown | null;
  leaderFraction: number;
  leaderCommission: number;
  followers: Array<{ user: string; vaultEquity: string; pnl: string; allTimePnl: string }>;
  maxDistributable: number;
  maxWithdrawable: number;
  isClosed: boolean;
  relationship: { type: string };
  allowDeposits: boolean;
  alwaysCloseOnWithdraw: boolean;
}

export interface HLClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Thin client for the Hyperliquid public /info POST endpoint.
 * Uses Node 20+ native fetch — avoids the intermittent DNS issues we saw
 * with undici when resolving binance/bybit/okx in some environments.
 */
export class HLClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: HLClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? HL_API_BASE;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  async info<T = unknown>(body: HLInfoRequest): Promise<T> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/info`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HL API ${res.status}: ${text}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  getAllMids(): Promise<HLAllMids> {
    return this.info<HLAllMids>({ type: "allMids" });
  }

  getClearinghouseState(user: string): Promise<HLClearinghouseState> {
    return this.info<HLClearinghouseState>({ type: "clearinghouseState", user });
  }

  getMetaAndAssetCtxs(): Promise<HLMetaAndAssetCtxs> {
    return this.info<HLMetaAndAssetCtxs>({ type: "metaAndAssetCtxs" });
  }

  getVaultDetails(vaultAddress: string): Promise<HLVaultDetails> {
    return this.info<HLVaultDetails>({ type: "vaultDetails", vaultAddress });
  }

  getL2Book(coin: string): Promise<HLL2Book> {
    return this.info<HLL2Book>({ type: "l2Book", coin });
  }

  getUserFills(user: string): Promise<HLUserFill[]> {
    return this.info<HLUserFill[]>({ type: "userFills", user });
  }

  getUserFunding(user: string, startTimeMs: number): Promise<HLFundingEvent[]> {
    return this.info<HLFundingEvent[]>({
      type: "userFunding",
      user,
      startTime: startTimeMs,
    });
  }

  getCandles(
    coin: string,
    interval: "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w",
    startTimeMs: number,
    endTimeMs: number,
  ): Promise<HLCandle[]> {
    return this.info<HLCandle[]>({
      type: "candleSnapshot",
      req: { coin, interval, startTime: startTimeMs, endTime: endTimeMs },
    });
  }

  /**
   * Fetch HL public leaderboard. Uses stats-data.hyperliquid.xyz which is
   * served with browser-origin CORS; server-side fetches from non-browser
   * clients are sometimes blocked at the edge. We send browser-like headers.
   * Returns raw rows; caller filters by window / sort.
   */
  async getLeaderboard(): Promise<HLLeaderboardRow[]> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs * 2);
    try {
      const res = await fetch("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard", {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://app.hyperliquid.xyz/",
          Origin: "https://app.hyperliquid.xyz",
          Accept: "application/json",
        },
        signal: ac.signal,
      });
      if (!res.ok) {
        throw new Error(`HL leaderboard ${res.status}`);
      }
      const data = (await res.json()) as { leaderboardRows?: HLLeaderboardRow[] };
      return data.leaderboardRows ?? [];
    } finally {
      clearTimeout(timer);
    }
  }
}

export const HL_VAULTS = {
  HLP: "0xdfc24b077bc1425ad1dea75bcb6f8158e10df303",
} as const;
