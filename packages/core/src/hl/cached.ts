import { MemoryCache } from "../cache.js";
import {
  type HLAllMids,
  type HLClearinghouseState,
  HLClient,
  type HLClientOptions,
  type HLL2Book,
  type HLMetaAndAssetCtxs,
  type HLUserFill,
  type HLVaultDetails,
} from "./client.js";

export interface CachedHLClientOptions extends HLClientOptions {
  /** TTL for allMids (default 30s). */
  midsTtlMs?: number;
  /** TTL for metaAndAssetCtxs (default 60s). */
  ctxsTtlMs?: number;
  /** TTL for clearinghouseState (default 30s, keyed by address). */
  stateTtlMs?: number;
  /** TTL for l2Book (default 10s, keyed by coin). */
  bookTtlMs?: number;
  /** TTL for vaultDetails (default 120s, keyed by address). */
  vaultTtlMs?: number;
  /** TTL for userFills (default 30s, keyed by address). */
  fillsTtlMs?: number;
}

/**
 * HLClient decorator that caches read-heavy responses in-process.
 * Use this in tool handlers so multiple tool calls within a TTL window share one upstream request.
 */
export class CachedHLClient {
  private readonly client: HLClient;
  private readonly midsCache: MemoryCache<string, HLAllMids>;
  private readonly ctxsCache: MemoryCache<string, HLMetaAndAssetCtxs>;
  private readonly stateCache: MemoryCache<string, HLClearinghouseState>;
  private readonly bookCache: MemoryCache<string, HLL2Book>;
  private readonly vaultCache: MemoryCache<string, HLVaultDetails>;
  private readonly fillsCache: MemoryCache<string, HLUserFill[]>;

  constructor(opts: CachedHLClientOptions = {}) {
    this.client = new HLClient(opts);
    this.midsCache = new MemoryCache({ ttlMs: opts.midsTtlMs ?? 30_000, max: 1 });
    this.ctxsCache = new MemoryCache({ ttlMs: opts.ctxsTtlMs ?? 60_000, max: 1 });
    this.stateCache = new MemoryCache({ ttlMs: opts.stateTtlMs ?? 30_000, max: 500 });
    this.bookCache = new MemoryCache({ ttlMs: opts.bookTtlMs ?? 10_000, max: 200 });
    this.vaultCache = new MemoryCache({ ttlMs: opts.vaultTtlMs ?? 120_000, max: 50 });
    this.fillsCache = new MemoryCache({ ttlMs: opts.fillsTtlMs ?? 30_000, max: 500 });
  }

  async getAllMids(): Promise<HLAllMids> {
    const hit = this.midsCache.get("all");
    if (hit) return hit;
    const v = await this.client.getAllMids();
    this.midsCache.set("all", v);
    return v;
  }

  async getMetaAndAssetCtxs(): Promise<HLMetaAndAssetCtxs> {
    const hit = this.ctxsCache.get("all");
    if (hit) return hit;
    const v = await this.client.getMetaAndAssetCtxs();
    this.ctxsCache.set("all", v);
    return v;
  }

  async getClearinghouseState(user: string): Promise<HLClearinghouseState> {
    const hit = this.stateCache.get(user);
    if (hit) return hit;
    const v = await this.client.getClearinghouseState(user);
    this.stateCache.set(user, v);
    return v;
  }

  async getL2Book(coin: string): Promise<HLL2Book> {
    const hit = this.bookCache.get(coin);
    if (hit) return hit;
    const v = await this.client.getL2Book(coin);
    this.bookCache.set(coin, v);
    return v;
  }

  async getVaultDetails(vaultAddress: string): Promise<HLVaultDetails> {
    const hit = this.vaultCache.get(vaultAddress);
    if (hit) return hit;
    const v = await this.client.getVaultDetails(vaultAddress);
    this.vaultCache.set(vaultAddress, v);
    return v;
  }

  async getUserFills(user: string): Promise<HLUserFill[]> {
    const hit = this.fillsCache.get(user);
    if (hit) return hit;
    const v = await this.client.getUserFills(user);
    this.fillsCache.set(user, v);
    return v;
  }
}

/**
 * Module-level shared client so every tool call in the same MCP process benefits
 * from the same cache (which is the whole point of this file).
 */
let sharedClient: CachedHLClient | null = null;

export function getSharedHLClient(): CachedHLClient {
  if (!sharedClient) sharedClient = new CachedHLClient();
  return sharedClient;
}
