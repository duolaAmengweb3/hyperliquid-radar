import { HLClient } from "@cexagent/core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const getWhaleFlowsTool: ToolDef = {
  name: "get_whale_flows",
  description:
    "Scan a list of addresses for recent large fills (≥ min_size_usd) in the last N hours. Returns a time-sorted stream of {address, asset, side, size, price, pnl} — useful for 'who moved the market in the last few hours'.",
  inputSchema: {
    type: "object",
    properties: {
      addresses: { type: "array", items: { type: "string" } },
      hours: { type: "number", default: 24 },
      min_size_usd: { type: "number", default: 1_000_000 },
    },
    required: ["addresses"],
  },
};

const inputSchema = z.object({
  addresses: z.array(z.string().min(1)).min(1).max(100),
  hours: z.number().min(1).max(168).default(24),
  min_size_usd: z.number().min(1000).default(1_000_000),
});

export async function handleGetWhaleFlows(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { addresses, hours, min_size_usd } = inputSchema.parse(rawArgs);
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
