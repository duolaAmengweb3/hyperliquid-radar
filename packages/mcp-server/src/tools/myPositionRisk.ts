import { HLClient } from "@cexagent/core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const myPositionRiskTool: ToolDef = {
  name: "my_position_risk",
  description:
    "Deep risk snapshot for a single Hyperliquid address. Returns each open position with distance to liq, unrealized PnL, and flags positions that are < 5% from liquidation. Uses only the public clearinghouseState endpoint — no private keys.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", description: "HL wallet (0x…)." },
    },
    required: ["address"],
  },
};

const inputSchema = z.object({ address: z.string().min(1) });

export async function handleMyPositionRisk(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { address } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [state, mids] = await Promise.all([
    client.getClearinghouseState(address),
    client.getAllMids(),
  ]);

  const positions = state.assetPositions.map((ap) => {
    const p = ap.position;
    const szi = Number(p.szi);
    const side: "long" | "short" | "flat" = szi > 0 ? "long" : szi < 0 ? "short" : "flat";
    const currentPrice = Number(mids[p.coin] ?? 0);
    const liqPx = p.liquidationPx ? Number(p.liquidationPx) : null;
    const distance =
      liqPx && currentPrice
        ? side === "long"
          ? ((currentPrice - liqPx) / currentPrice) * 100
          : ((liqPx - currentPrice) / currentPrice) * 100
        : null;
    return {
      asset: p.coin,
      side,
      size_usd: Math.abs(Number(p.positionValue)),
      leverage: p.leverage.value,
      entry_price: Number(p.entryPx),
      current_price: currentPrice,
      liq_price: liqPx,
      distance_to_liq_pct: distance === null ? null : Number(distance.toFixed(4)),
      unrealized_pnl_usd: Number(p.unrealizedPnl),
      margin_used_usd: Number(p.marginUsed),
      danger: distance !== null && distance < 5,
    };
  });

  const danger = positions.filter((p) => p.danger);
  return {
    address,
    account_value_usd: Number(state.marginSummary.accountValue),
    total_margin_used_usd: Number(state.marginSummary.totalMarginUsed),
    withdrawable_usd: Number(state.withdrawable),
    position_count: positions.length,
    positions,
    at_risk_count: danger.length,
    warnings: danger.map((p) => `${p.asset} ${p.side} is ${p.distance_to_liq_pct}% from liq`),
  };
}
