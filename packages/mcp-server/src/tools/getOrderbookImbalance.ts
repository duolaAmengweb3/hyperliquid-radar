import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const getOrderbookImbalanceTool: ToolDef = {
  name: "orderbook_imbalance",
  description:
    "Measure bid vs ask depth imbalance on a Hyperliquid order book within ±depth_pct of mid. " +
    "Returns bid/ask USD depth, ratio, and which side is dominant. Use this to answer 'is there buying pressure on BTC right now?' or to detect one-sided books before moves.",
  inputSchema: {
    type: "object",
    properties: {
      asset: {
        type: "string",
        description: "Coin symbol (e.g. 'BTC', 'ETH'). Case-sensitive on HL.",
      },
      depth_pct: {
        type: "number",
        description: "Depth range as percent of mid (both sides). Default 1.0 = ±1% of mid.",
        default: 1.0,
      },
    },
    required: ["asset"],
  },
};

const inputSchema = z.object({
  asset: z.string().min(1),
  depth_pct: z.number().min(0.05).max(10).default(1.0),
});

export async function handleGetOrderbookImbalance(rawArgs: Record<string, unknown>): Promise<{
  asset: string;
  mid_price: number;
  depth_pct: number;
  price_low: number;
  price_high: number;
  bid_depth_usd: number;
  ask_depth_usd: number;
  imbalance_ratio: number;
  dominant_side: "bid" | "ask" | "balanced";
  top_5_bids: Array<{ px: number; sz: number; orders: number }>;
  top_5_asks: Array<{ px: number; sz: number; orders: number }>;
}> {
  const { asset, depth_pct } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const book = await client.getL2Book(asset);

  const [bids, asks] = book.levels;
  if (bids.length === 0 || asks.length === 0) {
    throw new Error(`Empty order book for ${asset}`);
  }

  const bestBid = Number(bids[0].px);
  const bestAsk = Number(asks[0].px);
  const mid = (bestBid + bestAsk) / 2;
  const low = mid * (1 - depth_pct / 100);
  const high = mid * (1 + depth_pct / 100);

  const bidDepth = bids
    .filter((l) => Number(l.px) >= low)
    .reduce((acc, l) => acc + Number(l.px) * Number(l.sz), 0);
  const askDepth = asks
    .filter((l) => Number(l.px) <= high)
    .reduce((acc, l) => acc + Number(l.px) * Number(l.sz), 0);

  const ratio = askDepth === 0 ? Number.POSITIVE_INFINITY : bidDepth / askDepth;
  const dominant: "bid" | "ask" | "balanced" =
    ratio > 1.2 ? "bid" : ratio < 0.83 ? "ask" : "balanced";

  const top5 = (levels: typeof bids) =>
    levels.slice(0, 5).map((l) => ({
      px: Number(l.px),
      sz: Number(l.sz),
      orders: l.n,
    }));

  return {
    asset,
    mid_price: mid,
    depth_pct,
    price_low: Number(low.toFixed(4)),
    price_high: Number(high.toFixed(4)),
    bid_depth_usd: Number(bidDepth.toFixed(2)),
    ask_depth_usd: Number(askDepth.toFixed(2)),
    imbalance_ratio: Number(ratio.toFixed(4)),
    dominant_side: dominant,
    top_5_bids: top5(bids),
    top_5_asks: top5(asks),
  };
}
