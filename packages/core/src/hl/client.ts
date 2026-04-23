import { request } from "undici";

const HL_API_BASE = "https://api.hyperliquid.xyz";

export type HLInfoRequest =
  | { type: "allMids" }
  | { type: "clearinghouseState"; user: string }
  | { type: "metaAndAssetCtxs" }
  | { type: "userFills"; user: string }
  | { type: "userFunding"; user: string; startTime: number }
  | { type: "l2Book"; coin: string }
  | {
      type: "candleSnapshot";
      req: { coin: string; interval: string; startTime: number; endTime: number };
    };

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
}
