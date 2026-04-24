import { type HLClearinghouseState, HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import { seedAddressStrings } from "../seeds.js";
import type { ToolDef } from "./index.js";

export const liquidationHeatmapTool: ToolDef = {
  name: "liquidation_heatmap",
  description:
    "Density map of upcoming liquidations for an asset. Scans HL leaderboard top traders (59 addresses by default) or a custom set, and buckets at-risk USD by price band. Answers 'where are the liq clusters above and below current price'.",
  inputSchema: {
    type: "object",
    properties: {
      addresses: {
        type: "array",
        items: { type: "string" },
        description: "Optional. Defaults to HL leaderboard top traders.",
      },
      asset: { type: "string", description: "Coin symbol (BTC / ETH / HYPE …)." },
      bucket_pct: {
        type: "number",
        description: "Price bucket width as % of current price. Default 0.5.",
        default: 0.5,
      },
      range_pct: {
        type: "number",
        description: "Total range around current price to include (±). Default 15.",
        default: 15,
      },
    },
    required: ["asset"],
  },
};

const inputSchema = z.object({
  addresses: z.array(z.string().min(1)).max(200).optional(),
  asset: z.string().min(1),
  bucket_pct: z.number().min(0.1).max(5).default(0.5),
  range_pct: z.number().min(1).max(50).default(15),
});

export async function handleLiquidationHeatmap(rawArgs: Record<string, unknown>): Promise<unknown> {
  const parsed = inputSchema.parse(rawArgs);
  const addresses = parsed.addresses ?? seedAddressStrings();
  const { asset, bucket_pct, range_pct } = parsed;
  const client = new HLClient();
  const [mids, ...states] = await Promise.all([
    client.getAllMids(),
    ...addresses.map((a) => client.getClearinghouseState(a).catch(() => null)),
  ]);
  const currentPrice = Number(mids[asset] ?? 0);
  if (!currentPrice) throw new Error(`No mid price for ${asset}`);

  const lo = currentPrice * (1 - range_pct / 100);
  const hi = currentPrice * (1 + range_pct / 100);
  const step = currentPrice * (bucket_pct / 100);

  const buckets = new Map<string, { long_usd: number; short_usd: number }>();
  let scanned = 0;

  for (const state of states as Array<HLClearinghouseState | null>) {
    if (!state) continue;
    scanned += 1;
    for (const ap of state.assetPositions) {
      const p = ap.position;
      if (p.coin !== asset) continue;
      if (!p.liquidationPx) continue;
      const liq = Number(p.liquidationPx);
      if (liq < lo || liq > hi) continue;
      const sizeUsd = Math.abs(Number(p.positionValue));
      const szi = Number(p.szi);
      const bucketKey = (Math.floor(liq / step) * step).toFixed(2);
      const entry = buckets.get(bucketKey) ?? { long_usd: 0, short_usd: 0 };
      if (szi > 0) entry.long_usd += sizeUsd;
      else entry.short_usd += sizeUsd;
      buckets.set(bucketKey, entry);
    }
  }

  const rows = [...buckets.entries()]
    .map(([price, v]) => ({
      price: Number(price),
      cum_liq_usd_long: Number(v.long_usd.toFixed(2)),
      cum_liq_usd_short: Number(v.short_usd.toFixed(2)),
      total_usd: Number((v.long_usd + v.short_usd).toFixed(2)),
    }))
    .sort((a, b) => a.price - b.price);

  return {
    asset,
    current_price: currentPrice,
    bucket_pct,
    range_pct,
    addresses_scanned: scanned,
    total_long_usd: Number(rows.reduce((s, r) => s + r.cum_liq_usd_long, 0).toFixed(2)),
    total_short_usd: Number(rows.reduce((s, r) => s + r.cum_liq_usd_short, 0).toFixed(2)),
    buckets: rows,
    note: "Scans only provided addresses. HL has no 'all positions' endpoint — pass more addresses for better coverage.",
  };
}
