import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import { seedAddressStrings } from "../seeds.js";
import type { ToolDef } from "./index.js";

export const getWhaleFlowsTool: ToolDef = {
  name: "get_whale_flows",
  description:
    "Time-sorted large fills across a set of HL addresses. Default address set: 59 leaderboard top traders (pass your own `addresses` for a custom crowd). Returns {address, asset, side, size, price, pnl} for every fill ≥ min_size_usd in the last N hours — answers 'which whales moved the market recently'.",
  inputSchema: {
    type: "object",
    properties: {
      addresses: {
        type: "array",
        items: { type: "string" },
        description: "Optional. Defaults to HL leaderboard top traders.",
      },
      hours: { type: "number", default: 24 },
      min_size_usd: { type: "number", default: 1_000_000 },
    },
  },
};

const inputSchema = z.object({
  addresses: z.array(z.string().min(1)).max(100).optional(),
  hours: z.number().min(1).max(168).default(24),
  min_size_usd: z.number().min(1000).default(1_000_000),
});

export async function handleGetWhaleFlows(rawArgs: Record<string, unknown>): Promise<unknown> {
  const parsed = inputSchema.parse(rawArgs);
  const addresses = (parsed.addresses ?? seedAddressStrings()).slice(0, 100);
  const { hours, min_size_usd } = parsed;
  const client = new HLClient();
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  const results = await Promise.allSettled(
    addresses.map(async (addr) => ({
      addr,
      fills: await client.getUserFills(addr),
    })),
  );

  const flows: Array<{
    time: string;
    address: string;
    asset: string;
    side: "buy" | "sell";
    size: number;
    price: number;
    size_usd: number;
    closed_pnl_usd: number;
    dir?: string;
  }> = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const f of r.value.fills) {
      if (f.time < cutoff) continue;
      const sizeUsd = Number(f.px) * Number(f.sz);
      if (sizeUsd < min_size_usd) continue;
      flows.push({
        time: new Date(f.time).toISOString(),
        address: r.value.addr,
        asset: f.coin,
        side: f.side === "B" ? "buy" : "sell",
        size: Number(f.sz),
        price: Number(f.px),
        size_usd: Number(sizeUsd.toFixed(2)),
        closed_pnl_usd: Number(f.closedPnl),
        dir: f.dir,
      });
    }
  }

  flows.sort((a, b) => (a.time < b.time ? 1 : -1));

  return {
    addresses_scanned: addresses.length,
    successful: results.filter((r) => r.status === "fulfilled").length,
    hours,
    min_size_usd,
    total_flows: flows.length,
    flows: flows.slice(0, 200),
  };
}
