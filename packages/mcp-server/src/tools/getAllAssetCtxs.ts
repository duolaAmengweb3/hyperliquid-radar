import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const getAllAssetCtxsTool: ToolDef = {
  name: "get_all_asset_ctxs",
  description:
    "List all Hyperliquid perp assets with current mark price, funding rate (annual %), open interest (USD), and 24h volume. " +
    "Use this to find outliers (extreme funding, unusual OI, highest volume) across the full universe.",
  inputSchema: {
    type: "object",
    properties: {
      sort_by: {
        type: "string",
        enum: ["volume", "funding_abs", "oi_usd", "change_24h_abs"],
        description: "Sort field. Default 'volume' (descending).",
        default: "volume",
      },
      limit: {
        type: "number",
        description: "Max rows to return. Default 50, max 200.",
        default: 50,
      },
    },
  },
};

const inputSchema = z.object({
  sort_by: z.enum(["volume", "funding_abs", "oi_usd", "change_24h_abs"]).default("volume"),
  limit: z.number().int().min(1).max(200).default(50),
});

interface AssetRow {
  asset: string;
  mark_price: number;
  funding_annual_pct: number;
  open_interest_usd: number;
  day_volume_usd: number;
  change_24h_pct: number;
  max_leverage: number;
}

export async function handleGetAllAssetCtxs(rawArgs: Record<string, unknown>): Promise<{
  total: number;
  returned: number;
  sorted_by: string;
  assets: AssetRow[];
}> {
  const { sort_by, limit } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [meta, ctxs] = await client.getMetaAndAssetCtxs();

  const rows: AssetRow[] = meta.universe.map((m, i) => {
    const c = ctxs[i];
    const mark = Number(c.markPx);
    const prev = Number(c.prevDayPx);
    const change = prev === 0 ? 0 : ((mark - prev) / prev) * 100;
    const fundingHour = Number(c.funding);
    return {
      asset: m.name,
      mark_price: mark,
      funding_annual_pct: Number((fundingHour * 24 * 365 * 100).toFixed(4)),
      open_interest_usd: Number((Number(c.openInterest) * mark).toFixed(2)),
      day_volume_usd: Number(c.dayNtlVlm),
      change_24h_pct: Number(change.toFixed(4)),
      max_leverage: m.maxLeverage,
    };
  });

  const sorters: Record<typeof sort_by, (a: AssetRow, b: AssetRow) => number> = {
    volume: (a, b) => b.day_volume_usd - a.day_volume_usd,
    funding_abs: (a, b) => Math.abs(b.funding_annual_pct) - Math.abs(a.funding_annual_pct),
    oi_usd: (a, b) => b.open_interest_usd - a.open_interest_usd,
    change_24h_abs: (a, b) => Math.abs(b.change_24h_pct) - Math.abs(a.change_24h_pct),
  };
  rows.sort(sorters[sort_by]);

  return {
    total: rows.length,
    returned: Math.min(limit, rows.length),
    sorted_by: sort_by,
    assets: rows.slice(0, limit),
  };
}
