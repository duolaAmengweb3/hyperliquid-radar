import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const addressPositionHistoryTool: ToolDef = {
  name: "address_position_history",
  description:
    "Recent fill history for a single Hyperliquid address — returns fills grouped by asset with entry/exit sides, realized PnL per fill, and totals. Use this to research how a KOL or whale trades (their entries, average hold time, win rate).",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string" },
      days: { type: "number", default: 7, description: "Lookback window in days. Default 7." },
      asset: { type: "string", description: "Optional: filter to one asset." },
    },
    required: ["address"],
  },
};

const inputSchema = z.object({
  address: z.string().min(1),
  days: z.number().int().min(1).max(90).default(7),
  asset: z.string().optional(),
});

export async function handleAddressPositionHistory(
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const { address, days, asset } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const fills = await client.getUserFills(address);

  const filtered = fills.filter(
    (f) => f.time >= cutoff && (asset === undefined || f.coin === asset),
  );

  const byAsset = new Map<
    string,
    {
      asset: string;
      fill_count: number;
      total_volume_usd: number;
      realized_pnl_usd: number;
      buys: number;
      sells: number;
      liquidations: number;
    }
  >();

  for (const f of filtered) {
    const row = byAsset.get(f.coin) ?? {
      asset: f.coin,
      fill_count: 0,
      total_volume_usd: 0,
      realized_pnl_usd: 0,
      buys: 0,
      sells: 0,
      liquidations: 0,
    };
    row.fill_count += 1;
    row.total_volume_usd += Number(f.px) * Number(f.sz);
    row.realized_pnl_usd += Number(f.closedPnl);
    if (f.side === "B") row.buys += 1;
    else row.sells += 1;
    if (f.dir?.toLowerCase().includes("liquidat")) row.liquidations += 1;
    byAsset.set(f.coin, row);
  }

  const summary = [...byAsset.values()]
    .sort((a, b) => b.total_volume_usd - a.total_volume_usd)
    .map((r) => ({
      ...r,
      total_volume_usd: Number(r.total_volume_usd.toFixed(2)),
      realized_pnl_usd: Number(r.realized_pnl_usd.toFixed(2)),
    }));

  return {
    address,
    days,
    asset_filter: asset ?? null,
    total_fills: filtered.length,
    total_volume_usd: Number(summary.reduce((s, r) => s + r.total_volume_usd, 0).toFixed(2)),
    total_realized_pnl_usd: Number(summary.reduce((s, r) => s + r.realized_pnl_usd, 0).toFixed(2)),
    by_asset: summary,
    recent_fills: filtered
      .slice(-20)
      .reverse()
      .map((f) => ({
        time: new Date(f.time).toISOString(),
        asset: f.coin,
        side: f.side === "B" ? "buy" : "sell",
        size: Number(f.sz),
        price: Number(f.px),
        closed_pnl_usd: Number(f.closedPnl),
        dir: f.dir,
      })),
  };
}
