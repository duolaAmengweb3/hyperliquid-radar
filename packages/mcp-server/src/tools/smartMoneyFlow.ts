import { type HLClearinghouseState, HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import { seedAddressStrings } from "../seeds.js";
import type { ToolDef } from "./index.js";

export const smartMoneyFlowTool: ToolDef = {
  name: "smart_money_flow",
  description:
    "Aggregate current positions of a curated smart-money address set on a specific asset. Returns total long vs short USD, net bias, and top positions. Defaults to 59 addresses from HL's public leaderboard (top allTime + month + week PnL) when no addresses are provided — pass your own `addresses` for custom crowds.",
  inputSchema: {
    type: "object",
    properties: {
      addresses: {
        type: "array",
        items: { type: "string" },
        description: "Optional. Defaults to 59 HL leaderboard top traders if omitted.",
      },
      asset: { type: "string" },
    },
    required: ["asset"],
  },
};

const inputSchema = z.object({
  addresses: z.array(z.string().min(1)).max(200).optional(),
  asset: z.string().min(1),
});

export async function handleSmartMoneyFlow(rawArgs: Record<string, unknown>): Promise<unknown> {
  const parsed = inputSchema.parse(rawArgs);
  const addresses = parsed.addresses ?? seedAddressStrings();
  const asset = parsed.asset;
  const client = new HLClient();
  const states = await Promise.all(
    addresses.map((a) =>
      client
        .getClearinghouseState(a)
        .then((s) => ({ addr: a, s }))
        .catch(() => null),
    ),
  );

  let totalLong = 0;
  let totalShort = 0;
  const longs: Array<{ address: string; size_usd: number; leverage: number; entry_price: number }> =
    [];
  const shorts: typeof longs = [];

  for (const row of states) {
    if (!row) continue;
    const { addr, s } = row as { addr: string; s: HLClearinghouseState };
    for (const ap of s.assetPositions) {
      const p = ap.position;
      if (p.coin !== asset) continue;
      const szi = Number(p.szi);
      if (szi === 0) continue;
      const sizeUsd = Math.abs(Number(p.positionValue));
      const row = {
        address: addr,
        size_usd: Number(sizeUsd.toFixed(2)),
        leverage: p.leverage.value,
        entry_price: Number(p.entryPx),
      };
      if (szi > 0) {
        totalLong += sizeUsd;
        longs.push(row);
      } else {
        totalShort += sizeUsd;
        shorts.push(row);
      }
    }
  }

  longs.sort((a, b) => b.size_usd - a.size_usd);
  shorts.sort((a, b) => b.size_usd - a.size_usd);
  const net = totalLong - totalShort;
  const ratio = totalShort === 0 ? Number.POSITIVE_INFINITY : totalLong / totalShort;
  const bias: "long" | "short" | "balanced" =
    ratio > 1.3 ? "long" : ratio < 0.77 ? "short" : "balanced";

  return {
    asset,
    addresses_scanned: states.filter(Boolean).length,
    total_long_usd: Number(totalLong.toFixed(2)),
    total_short_usd: Number(totalShort.toFixed(2)),
    net_usd: Number(net.toFixed(2)),
    long_short_ratio: Number(ratio.toFixed(4)),
    net_bias: bias,
    top_longs: longs.slice(0, 10),
    top_shorts: shorts.slice(0, 10),
    note: "Addresses must be provided explicitly. No public HL leaderboard endpoint exists.",
  };
}
