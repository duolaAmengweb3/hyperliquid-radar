import { request } from "undici";

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
  /** Asset name, e.g. "BTC". */
  name: string;
  /** Perp sizes are rounded to this many decimals. */
  szDecimals: number;
  /** Max leverage allowed for this asset. */
  maxLeverage: number;
  /** If present and true, asset is only live on testnet or delisted etc. */
  onlyIsolated?: boolean;
}

export interface HLAssetCtx {
  /** Hourly funding rate (string). Multiply by 8 for 8h or 24 for 24h. */
  funding: string;
  /** Open interest in base units (not USD). */
  openInterest: string;
  /** 24h volume in USD. */
  dayNtlVlm: string;
  /** Current mid price. */
  midPx: string | null;
  /** Current mark price. */
  markPx: string;
  /** Premium (mark - index) / index. */
  premium: string | null;
  /** Index price (spot reference). */
  oraclePx: string;
  /** Previous day's close. */
  prevDayPx: string;
  /** Impact prices for a few standard sizes — used for depth estimate. */
  impactPxs?: [string, string] | null;
}

export type HLMetaAndAssetCtxs = [{ universe: HLAssetMeta[] }, HLAssetCtx[]];

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
  /** Total vault equity in USDC. */
  isClosed: boolean;
  relationship: { type: string };
  allowDeposits: boolean;
  alwaysCloseOnWithdraw: boolean;
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
    /** Signed size: negative = short. */
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

/** Mapping coin → current mid price, as strings per HL convention. */
export type HLAllMids = Record<string, string>;

export interface HLClientOptions {
  baseUrl?: string;
  /** Request timeout in ms (default 10s). */
  timeoutMs?: number;
}

/**
 * Thin client for the Hyperliquid public /info POST endpoint.
 * All methods are read-only; no auth needed.
 */
export class HLClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: HLClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? HL_API_BASE;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  async info<T = unknown>(body: HLInfoRequest): Promise<T> {
    const res = await request(`${this.baseUrl}/info`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      bodyTimeout: this.timeoutMs,
      headersTimeout: this.timeoutMs,
    });
    if (res.statusCode !== 200) {
      const text = await res.body.text();
      throw new Error(`HL API ${res.statusCode}: ${text}`);
    }
    return (await res.body.json()) as T;
  }

  getAllMids(): Promise<HLAllMids> {
    return this.info<HLAllMids>({ type: "allMids" });
  }

  getClearinghouseState(user: string): Promise<HLClearinghouseState> {
    return this.info<HLClearinghouseState>({
      type: "clearinghouseState",
      user,
    });
  }

  getMetaAndAssetCtxs(): Promise<HLMetaAndAssetCtxs> {
    return this.info<HLMetaAndAssetCtxs>({ type: "metaAndAssetCtxs" });
  }

  getVaultDetails(vaultAddress: string): Promise<HLVaultDetails> {
    return this.info<HLVaultDetails>({ type: "vaultDetails", vaultAddress });
  }
}

/**
 * Well-known HL public vault addresses.
 * HLP is the main Hyperliquidity Provider vault.
 */
export const HL_VAULTS = {
  HLP: "0xdfc24b077bc1425ad1dea75bcb6f8158e10df303",
} as const;
