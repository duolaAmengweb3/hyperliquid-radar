import { type HLClearinghouseState, HLClient } from "@cexagent/core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const getTopLiquidationRisksTool: ToolDef = {
  name: "get_top_liquidation_risks",
  description:
    "Scan a list of Hyperliquid wallet addresses and return the N open positions closest to liquidation, sorted by distance × size. " +
    "Each entry includes address, asset, side, size_usd, leverage, entry_price, liq_price, current_price, distance_to_liq_pct, unrealized_pnl_usd. " +
    "v1 requires explicit `addresses` (HL has no public 'all positions' endpoint). Future versions will auto-query leaderboard.",
  inputSchema: {
    type: "object",
    properties: {
      addresses: {
        type: "array",
        items: { type: "string" },
        description: "Hyperliquid wallet addresses (0x-prefixed) to scan.",
      },
      n: {
        type: "number",
        description: "Max number of positions to return. Default 10, capped at 100.",
        default: 10,
      },
      asset: {
        type: "string",
        description: "Optional: limit results to a specific coin like 'BTC', 'ETH', 'HYPE'.",
      },
    },
    required: ["addresses"],
  },
};

const inputSchema = z.object({
  addresses: z.array(z.string().min(1)).min(1).max(100),
  n: z.number().int().min(1).max(100).default(10),
  asset: z.string().optional(),
});

export interface LiquidationRisk {
  address: string;
  asset: string;
  side: "long" | "short";
  size_usd: number;
  leverage: number;
  entry_price: number;
  liq_price: number;
  current_price: number;
  distance_to_liq_pct: number;
  unrealized_pnl_usd: number;
}

export async function handleGetTopLiquidationRisks(rawArgs: Record<string, unknown>): Promise<{
  queried_addresses: number;
  successful_queries: number;
  total_positions_found: number;
  returned: number;
  positions: LiquidationRisk[];
}> {
  const { addresses, n, asset } = inputSchema.parse(rawArgs);
  const client = new HLClient();

  // Fetch all mid prices once (shared by all positions).
  const allMids = await client.getAllMids();

  // Fetch every address's clearinghouse state in parallel. Failures for
  // individual addresses are tolerated — we still return what we got.
  const fetched = await Promise.allSettled(
    addresses.map(async (addr) => {
      const state = await client.getClearinghouseState(addr);
      return { addr, state };
    }),
  );

  let successful = 0;
  const risks: LiquidationRisk[] = [];

  for (const r of fetched) {
    if (r.status !== "fulfilled") continue;
    successful += 1;
    const { addr, state } = r.value;
    collectRisks(addr, state, allMids, risks, asset);
  }

  risks.sort((a, b) => {
    if (a.distance_to_liq_pct !== b.distance_to_liq_pct) {
      return a.distance_to_liq_pct - b.distance_to_liq_pct;
    }
    return b.size_usd - a.size_usd;
  });

  return {
    queried_addresses: addresses.length,
    successful_queries: successful,
    total_positions_found: risks.length,
    returned: Math.min(n, risks.length),
    positions: risks.slice(0, n),
  };
}

function collectRisks(
  address: string,
  state: HLClearinghouseState,
  allMids: Record<string, string>,
  out: LiquidationRisk[],
  assetFilter: string | undefined,
): void {
  for (const ap of state.assetPositions) {
    const p = ap.position;
    if (assetFilter && p.coin !== assetFilter) continue;
    if (!p.liquidationPx) continue; // closed or fully hedged

    const szi = Number(p.szi);
    if (szi === 0) continue;

    const side: "long" | "short" = szi > 0 ? "long" : "short";
    const currentPrice = Number(allMids[p.coin] ?? 0);
    if (!currentPrice) continue;

    const liqPrice = Number(p.liquidationPx);
    if (!liqPrice) continue;

    const distance =
      side === "long"
        ? ((currentPrice - liqPrice) / currentPrice) * 100
        : ((liqPrice - currentPrice) / currentPrice) * 100;

    // Skip positions already past liquidation (shouldn't happen but guard anyway).
    if (distance < 0) continue;

    out.push({
      address,
      asset: p.coin,
      side,
      size_usd: Math.abs(Number(p.positionValue)),
      leverage: p.leverage.value,
      entry_price: Number(p.entryPx),
      liq_price: liqPrice,
      current_price: currentPrice,
      distance_to_liq_pct: Number(distance.toFixed(4)),
      unrealized_pnl_usd: Number(p.unrealizedPnl),
    });
  }
}
