import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const getFundingPnlTool: ToolDef = {
  name: "get_funding_pnl",
  description:
    "Sum all funding payments an HL address has paid or received over the last N days, broken down by asset. Positive = received, negative = paid. Uses HL public userFunding endpoint. Critical for: funding-arb trades wanting to tally real realized carry, or for seeing 'am I being bled out by funding on this long'.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", description: "HL wallet address." },
      days: {
        type: "number",
        default: 7,
        description: "Lookback window in days (1-90).",
      },
    },
    required: ["address"],
  },
};

const inputSchema = z.object({
  address: z.string().min(1),
  days: z.number().int().min(1).max(90).default(7),
});

interface AssetRow {
  asset: string;
  event_count: number;
  net_usd: number;
  paid_usd: number;
  received_usd: number;
}

export async function handleGetFundingPnl(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { address, days } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const startMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const events = await client.getUserFunding(address, startMs);

  const byAsset = new Map<string, AssetRow>();
  let netTotal = 0;
  let paidTotal = 0;
  let receivedTotal = 0;

  for (const e of events) {
    // HL convention: usdc is positive when received, negative when paid (from trader's POV).
    const usdc = Number(e.usdc);
    const row =
      byAsset.get(e.coin) ??
      ({
        asset: e.coin,
        event_count: 0,
        net_usd: 0,
        paid_usd: 0,
        received_usd: 0,
      } satisfies AssetRow);
    row.event_count += 1;
    row.net_usd += usdc;
    if (usdc >= 0) row.received_usd += usdc;
    else row.paid_usd += -usdc;
    byAsset.set(e.coin, row);

    netTotal += usdc;
    if (usdc >= 0) receivedTotal += usdc;
    else paidTotal += -usdc;
  }

  const rows = [...byAsset.values()]
    .sort((a, b) => Math.abs(b.net_usd) - Math.abs(a.net_usd))
    .map((r) => ({
      asset: r.asset,
      event_count: r.event_count,
      net_usd: Number(r.net_usd.toFixed(4)),
      paid_usd: Number(r.paid_usd.toFixed(4)),
      received_usd: Number(r.received_usd.toFixed(4)),
    }));

  return {
    address,
    days,
    event_count: events.length,
    total_net_usd: Number(netTotal.toFixed(4)),
    total_paid_usd: Number(paidTotal.toFixed(4)),
    total_received_usd: Number(receivedTotal.toFixed(4)),
    by_asset: rows,
    interpretation:
      netTotal >= 0
        ? `Net funding income of ${netTotal.toFixed(2)} USDC over ${days}d.`
        : `Net funding paid out of ${(-netTotal).toFixed(2)} USDC over ${days}d.`,
  };
}
