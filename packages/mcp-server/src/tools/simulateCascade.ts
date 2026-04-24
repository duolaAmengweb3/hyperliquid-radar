import { type HLClearinghouseState, HLClient } from "@cexagent/core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const simulateCascadeTool: ToolDef = {
  name: "simulate_cascade",
  description:
    "Simulate a price shock and estimate the cascade of liquidations it would trigger across a provided address list. Iterates 3 waves: each wave's liquidation flow impacts price via orderbook depth, which triggers more liquidations. Returns waves, total USD liquidated, and top losers. Estimate only — not a prediction.",
  inputSchema: {
    type: "object",
    properties: {
      addresses: { type: "array", items: { type: "string" } },
      asset: { type: "string" },
      stress_pct: {
        type: "number",
        description: "Instant price shock in %. Negative = drop (e.g. -5 for 5% down).",
      },
    },
    required: ["addresses", "asset", "stress_pct"],
  },
};

const inputSchema = z.object({
  addresses: z.array(z.string().min(1)).min(1).max(200),
  asset: z.string().min(1),
  stress_pct: z.number().min(-50).max(50),
});

interface CascadePosition {
  address: string;
  side: "long" | "short";
  size_usd: number;
  liq_price: number;
  unrealized_pnl: number;
}

export async function handleSimulateCascade(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { addresses, asset, stress_pct } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [mids, book, ...states] = await Promise.all([
    client.getAllMids(),
    client.getL2Book(asset),
    ...addresses.map((a) => client.getClearinghouseState(a).catch(() => null)),
  ]);

  const currentPrice = Number(mids[asset] ?? 0);
  if (!currentPrice) throw new Error(`No mid price for ${asset}`);

  // Build the flat position list for this asset.
  const positions: CascadePosition[] = [];
  for (const state of states as Array<HLClearinghouseState | null>) {
    if (!state) continue;
    for (const ap of state.assetPositions) {
      const p = ap.position;
      if (p.coin !== asset || !p.liquidationPx) continue;
      const szi = Number(p.szi);
      if (szi === 0) continue;
      positions.push({
        address: "<redacted>",
        side: szi > 0 ? "long" : "short",
        size_usd: Math.abs(Number(p.positionValue)),
        liq_price: Number(p.liquidationPx),
        unrealized_pnl: Number(p.unrealizedPnl),
      });
    }
  }

  // Estimate price impact per $1M of selling: use average size per level on the opposite side.
  // For a drop, we sell into bids (long liquidations → sells).
  const bids = book.levels[0];
  const totalBidUsd = bids.reduce((s, l) => s + Number(l.px) * Number(l.sz), 0);
  const bidRange = bids.length
    ? currentPrice - Number(bids[bids.length - 1].px)
    : currentPrice * 0.01;
  // Impact per USD: how many price units the full bid stack absorbs.
  const priceImpactPerUsd = totalBidUsd > 0 ? bidRange / totalBidUsd : 0;

  const shockedPrice = currentPrice * (1 + stress_pct / 100);
  let effectivePrice = shockedPrice;

  const waves: Array<{
    wave: number;
    price: number;
    price_impact_pct: number;
    additional_liq_usd: number;
    positions_wiped: number;
  }> = [];

  const liquidated = new Set<number>();

  for (let w = 1; w <= 3; w += 1) {
    let waveLiqUsd = 0;
    let wiped = 0;
    positions.forEach((p, i) => {
      if (liquidated.has(i)) return;
      const triggered =
        (p.side === "long" && effectivePrice <= p.liq_price) ||
        (p.side === "short" && effectivePrice >= p.liq_price);
      if (triggered) {
        liquidated.add(i);
        waveLiqUsd += p.size_usd;
        wiped += 1;
      }
    });

    const priceDelta = -waveLiqUsd * priceImpactPerUsd * (stress_pct < 0 ? 1 : -1);
    const nextPrice = effectivePrice + priceDelta;
    waves.push({
      wave: w,
      price: Number(effectivePrice.toFixed(4)),
      price_impact_pct: Number(((priceDelta / currentPrice) * 100).toFixed(4)),
      additional_liq_usd: Number(waveLiqUsd.toFixed(2)),
      positions_wiped: wiped,
    });
    if (wiped === 0) break;
    effectivePrice = nextPrice;
  }

  const totalLiqUsd = waves.reduce((s, w) => s + w.additional_liq_usd, 0);
  const topLosers = positions
    .filter((_p, i) => liquidated.has(i))
    .sort((a, b) => b.size_usd - a.size_usd)
    .slice(0, 5)
    .map((p) => ({ side: p.side, size_usd: p.size_usd, liq_price: p.liq_price }));

  return {
    asset,
    current_price: currentPrice,
    stress_pct,
    trigger_price: Number(shockedPrice.toFixed(4)),
    final_price_estimate: Number(effectivePrice.toFixed(4)),
    total_liq_usd: Number(totalLiqUsd.toFixed(2)),
    waves,
    top_losers: topLosers,
    addresses_scanned: states.filter(Boolean).length,
    disclaimer:
      "Estimate. Assumes all liquidation flow is absorbed by current bid-side depth with linear impact. Real markets exhibit non-linear dynamics, makers pull, and CEX flow arbitrages.",
  };
}
