import { getSharedHLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const simulateMyLiqPriceTool: ToolDef = {
  name: "simulate_my_liq_price",
  description:
    "Estimate the new liquidation price if you add (or reduce) a position on Hyperliquid. Pass the current position address + asset + delta size in USD. Negative delta = reduce / close. Returns current liq price, projected liq price, and distance from current mark. Useful for 'if I add $50k to my ETH long, where's my new liq?'",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", description: "The HL address holding the position." },
      asset: { type: "string", description: "Coin symbol (e.g. 'BTC', 'HYPE')." },
      delta_size_usd: {
        type: "number",
        description:
          "Change in notional USD. Positive = add to existing direction. Negative = reduce / close.",
      },
    },
    required: ["address", "asset", "delta_size_usd"],
  },
};

const inputSchema = z.object({
  address: z.string().min(1),
  asset: z.string().min(1),
  delta_size_usd: z.number(),
});

export async function handleSimulateMyLiqPrice(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { address, asset, delta_size_usd } = inputSchema.parse(rawArgs);
  const client = getSharedHLClient();
  const [state, mids] = await Promise.all([
    client.getClearinghouseState(address),
    client.getAllMids(),
  ]);

  const mark = Number(mids[asset] ?? 0);
  if (!mark) throw new Error(`No mid price for ${asset}`);

  const ap = state.assetPositions.find((x) => x.position.coin === asset);
  if (!ap) {
    return {
      address,
      asset,
      current_mark_price: mark,
      status: "no_existing_position",
      note: "Cannot estimate a new liq price without an existing position to modify. Open one first or use HL UI to preview a fresh entry.",
    };
  }

  const p = ap.position;
  const szi = Number(p.szi);
  const side: "long" | "short" = szi > 0 ? "long" : "short";
  const currentSizeUsd = Math.abs(Number(p.positionValue));
  const currentLeverage = p.leverage.value;
  const accountValue = Number(state.marginSummary.accountValue);
  const currentLiqPx = p.liquidationPx ? Number(p.liquidationPx) : null;

  const newSizeUsd = Math.max(0, currentSizeUsd + delta_size_usd);
  const newLeverage = accountValue > 0 ? newSizeUsd / accountValue : currentLeverage;

  // Simplified isolated/cross approximation: maintenance margin ~= 1 / (2 * maxLeverage)
  // (HL uses half of initial margin requirement as maintenance).
  const maxLeverage = p.leverage.value; // this is current lev; conservative proxy for max
  const maintenanceMarginRate = 1 / (2 * Math.max(maxLeverage, 2));

  // Liq price formula (approx): entry * (1 - 1/lev + MMR) for long; entry * (1 + 1/lev - MMR) for short.
  const entryPx = Number(p.entryPx);
  const projectedLiq =
    newLeverage > 0
      ? side === "long"
        ? entryPx * (1 - 1 / newLeverage + maintenanceMarginRate)
        : entryPx * (1 + 1 / newLeverage - maintenanceMarginRate)
      : null;

  const distanceToCurrent =
    currentLiqPx === null
      ? null
      : side === "long"
        ? ((mark - currentLiqPx) / mark) * 100
        : ((currentLiqPx - mark) / mark) * 100;
  const distanceToProjected =
    projectedLiq === null
      ? null
      : side === "long"
        ? ((mark - projectedLiq) / mark) * 100
        : ((projectedLiq - mark) / mark) * 100;

  return {
    address,
    asset,
    side,
    current_mark_price: mark,
    current_size_usd: currentSizeUsd,
    current_liq_price: currentLiqPx,
    current_distance_to_liq_pct: distanceToCurrent && Number(distanceToCurrent.toFixed(4)),
    delta_size_usd,
    projected_size_usd: Number(newSizeUsd.toFixed(2)),
    projected_leverage: Number(newLeverage.toFixed(4)),
    projected_liq_price: projectedLiq && Number(projectedLiq.toFixed(4)),
    projected_distance_to_liq_pct: distanceToProjected && Number(distanceToProjected.toFixed(4)),
    account_value_usd: accountValue,
    disclaimer:
      "Approximation. Uses simplified maintenance margin formula. Real HL liq price depends on cross/isolated mode, borrow interest, cross-asset PnL. Confirm in HL UI before risking capital.",
  };
}
