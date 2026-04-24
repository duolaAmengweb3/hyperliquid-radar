import { getSharedHLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import { seedAddressStrings } from "../seeds.js";
import type { ToolDef } from "./index.js";

export const getRecentLiquidationsTool: ToolDef = {
  name: "get_recent_liquidations",
  description:
    "Scan a set of addresses for recent liquidation events on Hyperliquid. Returns time-sorted liquidations with asset, side, size USD, liq mark price, and PnL. If no addresses provided, uses a built-in seed list (small — pass your own for broader coverage). HL has no public 'all liquidations' feed, so we can only find liqs on addresses we scan.",
  inputSchema: {
    type: "object",
    properties: {
      addresses: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of addresses to scan. Defaults to curated seed list.",
      },
      hours: { type: "number", default: 24, description: "Lookback window in hours." },
      min_size_usd: {
        type: "number",
        default: 10_000,
        description: "Filter out liquidations smaller than this.",
      },
    },
  },
};

const inputSchema = z.object({
  addresses: z.array(z.string().min(1)).max(100).optional(),
  hours: z.number().min(1).max(168).default(24),
  min_size_usd: z.number().min(0).default(10_000),
});

export async function handleGetRecentLiquidations(
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const parsed = inputSchema.parse(rawArgs);
  const addresses = parsed.addresses ?? seedAddressStrings();
  const { hours, min_size_usd } = parsed;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  const client = getSharedHLClient();
  const results = await Promise.allSettled(
    addresses.map(async (addr) => ({ addr, fills: await client.getUserFills(addr) })),
  );

  interface LiqRow {
    time: string;
    address: string;
    asset: string;
    side: "close_long" | "close_short";
    size: number;
    price: number;
    size_usd: number;
    closed_pnl_usd: number;
    mark_px?: number;
  }
  const liqs: LiqRow[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const f of r.value.fills) {
      if (f.time < cutoff) continue;
      if (!f.dir?.toLowerCase().includes("liquidat") && !("liquidation" in f)) continue;
      const sizeUsd = Number(f.px) * Number(f.sz);
      if (sizeUsd < min_size_usd) continue;
      const liqObj = (f as unknown as { liquidation?: { markPx?: string } }).liquidation;
      liqs.push({
        time: new Date(f.time).toISOString(),
        address: r.value.addr,
        asset: f.coin,
        // "B" buy → closing short → liquidation of short; "A" sell → closing long.
        side: f.side === "B" ? "close_short" : "close_long",
        size: Number(f.sz),
        price: Number(f.px),
        size_usd: Number(sizeUsd.toFixed(2)),
        closed_pnl_usd: Number(f.closedPnl),
        mark_px: liqObj?.markPx ? Number(liqObj.markPx) : undefined,
      });
    }
  }

  liqs.sort((a, b) => (a.time < b.time ? 1 : -1));

  return {
    addresses_scanned: addresses.length,
    successful: results.filter((r) => r.status === "fulfilled").length,
    seed_mode: parsed.addresses === undefined,
    hours,
    min_size_usd,
    total_liquidations: liqs.length,
    liquidations: liqs.slice(0, 200),
  };
}
