import { HLClient, HL_VAULTS } from "hyperliquid-radar-core";
import type { ToolDef } from "./index.js";

export const getHlpMetricsTool: ToolDef = {
  name: "hlp_metrics",
  description:
    "Current state of the Hyperliquidity Provider (HLP) vault — the main on-chain market maker for HL perps. " +
    "Returns APR, leader commission, follower count, max withdrawable (TVL proxy), and whether deposits are open. " +
    "Use this when users ask 'how is HLP doing', 'is HLP losing money', or 'should I stake into HLP'.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export async function handleGetHlpMetrics(_args: Record<string, unknown>): Promise<{
  vault_address: string;
  name: string;
  apr: number;
  leader_commission: number;
  leader_fraction: number;
  follower_count: number;
  max_withdrawable: number;
  max_distributable: number;
  allow_deposits: boolean;
  is_closed: boolean;
  disclaimer: string;
}> {
  const client = new HLClient();
  const v = await client.getVaultDetails(HL_VAULTS.HLP);

  return {
    vault_address: HL_VAULTS.HLP,
    name: v.name,
    apr: v.apr,
    leader_commission: v.leaderCommission,
    leader_fraction: v.leaderFraction,
    follower_count: v.followers?.length ?? 0,
    max_withdrawable: v.maxWithdrawable,
    max_distributable: v.maxDistributable,
    allow_deposits: v.allowDeposits,
    is_closed: v.isClosed,
    disclaimer:
      "APR is trailing; past performance does not predict future returns. HLP takes the other side of market maker flow; can drawdown during volatility.",
  };
}
