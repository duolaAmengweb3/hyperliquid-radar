import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const whalePnlLeaderboardTool: ToolDef = {
  name: "whale_pnl_leaderboard",
  description:
    "Fetch the live Hyperliquid public leaderboard (top PnL / volume traders). Filter by time window ('day' / 'week' / 'month' / 'allTime') and sort by 'pnl' or 'roi' or 'vlm'. Returns address, display name, account value, PnL, ROI%, and volume for each row. Useful for 'who are the top HL traders right now' and provides addresses for other tools that need explicit `addresses` input.",
  inputSchema: {
    type: "object",
    properties: {
      window: {
        type: "string",
        enum: ["day", "week", "month", "allTime"],
        default: "week",
        description: "Performance time window.",
      },
      sort_by: {
        type: "string",
        enum: ["pnl", "roi", "vlm"],
        default: "pnl",
        description: "Sort field within the chosen window.",
      },
      limit: {
        type: "number",
        default: 20,
        description: "Max rows to return (1-100).",
      },
      min_account_value_usd: {
        type: "number",
        description: "Filter out accounts below this account value.",
      },
    },
  },
};

const inputSchema = z.object({
  window: z.enum(["day", "week", "month", "allTime"]).default("week"),
  sort_by: z.enum(["pnl", "roi", "vlm"]).default("pnl"),
  limit: z.number().int().min(1).max(100).default(20),
  min_account_value_usd: z.number().nonnegative().optional(),
});

interface LeaderboardOut {
  rank: number;
  address: string;
  display_name: string | null;
  account_value_usd: number;
  pnl_usd: number;
  roi_pct: number;
  volume_usd: number;
}

export async function handleWhalePnlLeaderboard(
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const { window, sort_by, limit, min_account_value_usd } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const rows = await client.getLeaderboard();

  const mapped: LeaderboardOut[] = rows
    .map((r) => {
      const win = r.windowPerformances.find(([w]) => w === window);
      const perf = win?.[1];
      return {
        address: r.ethAddress,
        display_name: r.displayName ?? null,
        account_value_usd: Number(r.accountValue),
        pnl_usd: perf ? Number(perf.pnl) : 0,
        roi_pct: perf ? Number(perf.roi) * 100 : 0,
        volume_usd: perf ? Number(perf.vlm) : 0,
        rank: 0,
      };
    })
    .filter((r) =>
      min_account_value_usd === undefined ? true : r.account_value_usd >= min_account_value_usd,
    );

  const sorters: Record<typeof sort_by, (a: LeaderboardOut, b: LeaderboardOut) => number> = {
    pnl: (a, b) => b.pnl_usd - a.pnl_usd,
    roi: (a, b) => b.roi_pct - a.roi_pct,
    vlm: (a, b) => b.volume_usd - a.volume_usd,
  };
  mapped.sort(sorters[sort_by]);
  mapped.forEach((r, i) => {
    r.rank = i + 1;
  });

  return {
    window,
    sort_by,
    total: mapped.length,
    returned: Math.min(limit, mapped.length),
    top_traders: mapped.slice(0, limit),
    note: "Live HL public leaderboard via stats-data.hyperliquid.xyz. Addresses listed here can be passed into get_whale_flows / smart_money_flow / address_position_history for deeper analysis.",
  };
}
