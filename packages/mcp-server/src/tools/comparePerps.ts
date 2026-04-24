import { getSharedHLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const comparePerpsTool: ToolDef = {
  name: "compare_perps",
  description:
    "Side-by-side comparison of several Hyperliquid perps. Returns each asset's mark price, 24h change, funding (annual %), OI (USD), 24h volume, and max leverage in one table. Use when user asks 'compare BTC vs ETH vs SOL' or similar.",
  inputSchema: {
    type: "object",
    properties: {
      assets: {
        type: "array",
        items: { type: "string" },
        description: "2-20 coin symbols to compare (case-sensitive).",
      },
    },
    required: ["assets"],
  },
};

const inputSchema = z.object({
  assets: z.array(z.string().min(1)).min(2).max(20),
});

export async function handleComparePerps(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { assets } = inputSchema.parse(rawArgs);
  const client = getSharedHLClient();
  const [meta, ctxs] = await client.getMetaAndAssetCtxs();

  const rows = assets.map((asset) => {
    const idx = meta.universe.findIndex((u) => u.name === asset);
    if (idx === -1) return { asset, error: "not_listed" as const };
    const m = meta.universe[idx];
    const c = ctxs[idx];
    const mark = Number(c.markPx);
    const prev = Number(c.prevDayPx);
    const change = prev === 0 ? 0 : ((mark - prev) / prev) * 100;
    const fundingHour = Number(c.funding);
    return {
      asset,
      mark_price: mark,
      change_24h_pct: Number(change.toFixed(4)),
      funding_annual_pct: Number((fundingHour * 24 * 365 * 100).toFixed(4)),
      open_interest_usd: Number((Number(c.openInterest) * mark).toFixed(2)),
      day_volume_usd: Number(c.dayNtlVlm),
      max_leverage: m.maxLeverage,
    };
  });

  return {
    count: assets.length,
    table: rows,
  };
}
