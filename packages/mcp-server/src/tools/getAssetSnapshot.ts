import { HLClient } from "@cexagent/core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const getAssetSnapshotTool: ToolDef = {
  name: "asset_snapshot",
  description:
    "One-shot overview of a single Hyperliquid asset. Returns current price, funding rate, open interest, 24h volume, 24h change %, max leverage, and impact price depth. " +
    "Use this when a user asks 'what's happening with BTC/ETH/HYPE' and you want a structured single-call answer.",
  inputSchema: {
    type: "object",
    properties: {
      asset: {
        type: "string",
        description: "Coin symbol (e.g. 'BTC', 'ETH', 'HYPE'). Case-sensitive on HL.",
      },
    },
    required: ["asset"],
  },
};

const inputSchema = z.object({
  asset: z.string().min(1),
});

export async function handleGetAssetSnapshot(rawArgs: Record<string, unknown>): Promise<{
  asset: string;
  mark_price: number;
  oracle_price: number;
  mid_price: number | null;
  prev_day_price: number;
  change_24h_pct: number;
  funding_per_hour_pct: number;
  funding_annual_pct: number;
  open_interest_base: number;
  open_interest_usd: number;
  day_volume_usd: number;
  max_leverage: number;
  premium_pct: number | null;
  impact_prices: { bid: number; ask: number } | null;
}> {
  const { asset } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [meta, ctxs] = await client.getMetaAndAssetCtxs();

  const idx = meta.universe.findIndex((u) => u.name === asset);
  if (idx === -1) {
    throw new Error(`Asset '${asset}' not listed on Hyperliquid`);
  }
  const m = meta.universe[idx];
  const c = ctxs[idx];

  const markPx = Number(c.markPx);
  const prevDay = Number(c.prevDayPx);
  const change24h = prevDay === 0 ? 0 : ((markPx - prevDay) / prevDay) * 100;
  const fundingHour = Number(c.funding);
  const oiBase = Number(c.openInterest);

  return {
    asset,
    mark_price: markPx,
    oracle_price: Number(c.oraclePx),
    mid_price: c.midPx === null ? null : Number(c.midPx),
    prev_day_price: prevDay,
    change_24h_pct: Number(change24h.toFixed(4)),
    funding_per_hour_pct: Number((fundingHour * 100).toFixed(6)),
    funding_annual_pct: Number((fundingHour * 24 * 365 * 100).toFixed(4)),
    open_interest_base: oiBase,
    open_interest_usd: Number((oiBase * markPx).toFixed(2)),
    day_volume_usd: Number(c.dayNtlVlm),
    max_leverage: m.maxLeverage,
    premium_pct: c.premium === null ? null : Number((Number(c.premium) * 100).toFixed(6)),
    impact_prices: c.impactPxs
      ? { bid: Number(c.impactPxs[0]), ask: Number(c.impactPxs[1]) }
      : null,
  };
}
