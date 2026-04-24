import { z } from "zod";
import type { ToolDef } from "./index.js";

const ALERT_API_URL = process.env.ALERT_API_URL ?? "http://localhost:3200";

const destinationSchema = {
  destination_type: {
    type: "string",
    enum: ["telegram_chat_id", "discord_webhook", "http_webhook"],
    description: "Where the alert should be pushed.",
  },
  destination: {
    type: "string",
    description:
      "Telegram chat_id (use /myid on @hl_radar_bot), Discord webhook URL, or any HTTPS webhook URL.",
  },
};

const destZod = z.object({
  destination_type: z.enum(["telegram_chat_id", "discord_webhook", "http_webhook"]),
  destination: z.string().min(1),
});

async function callApi(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${ALERT_API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `alert-api ${res.status} at ${ALERT_API_URL}${path}: ${text}. Set ALERT_API_URL env var if your server runs elsewhere.`,
    );
  }
  return res.json();
}

// ===== subscribe_wallet =====

export const subscribeWalletTool: ToolDef = {
  name: "subscribe_wallet",
  description:
    "Subscribe to every action of a Hyperliquid wallet. Alerts fire on each new fill. 30-day TTL; we store no user identity.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string" },
      ...destinationSchema,
    },
    required: ["address", "destination_type", "destination"],
  },
};
const subscribeWalletIn = z.object({ address: z.string().min(1) }).and(destZod);
export async function handleSubscribeWallet(args: Record<string, unknown>): Promise<unknown> {
  const { address, destination_type, destination } = subscribeWalletIn.parse(args);
  return callApi("/v1/alerts/subscribe", {
    kind: "wallet",
    criteria: { address },
    destination_type,
    destination,
  });
}

// ===== subscribe_liq_threshold =====

export const subscribeLiqThresholdTool: ToolDef = {
  name: "subscribe_liq_threshold",
  description:
    "Alert when any position of the given address is within threshold_pct of its liquidation price.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string" },
      threshold_pct: {
        type: "number",
        description: "Fire alert when distance_to_liq_pct < this value. E.g. 5 = 5%.",
      },
      ...destinationSchema,
    },
    required: ["address", "threshold_pct", "destination_type", "destination"],
  },
};
const subLiqIn = z
  .object({ address: z.string().min(1), threshold_pct: z.number().positive().max(50) })
  .and(destZod);
export async function handleSubscribeLiqThreshold(args: Record<string, unknown>): Promise<unknown> {
  const p = subLiqIn.parse(args);
  return callApi("/v1/alerts/subscribe", {
    kind: "liq_threshold",
    criteria: { address: p.address, threshold_pct: p.threshold_pct },
    destination_type: p.destination_type,
    destination: p.destination,
  });
}

// ===== subscribe_whale_entry =====

export const subscribeWhaleEntryTool: ToolDef = {
  name: "subscribe_whale_entry",
  description: "Alert on new open positions on an asset with size ≥ min_size_usd.",
  inputSchema: {
    type: "object",
    properties: {
      asset: { type: "string" },
      min_size_usd: { type: "number" },
      ...destinationSchema,
    },
    required: ["asset", "min_size_usd", "destination_type", "destination"],
  },
};
const subWhaleIn = z
  .object({ asset: z.string().min(1), min_size_usd: z.number().positive() })
  .and(destZod);
export async function handleSubscribeWhaleEntry(args: Record<string, unknown>): Promise<unknown> {
  const p = subWhaleIn.parse(args);
  return callApi("/v1/alerts/subscribe", {
    kind: "whale_entry",
    criteria: { asset: p.asset, min_size_usd: p.min_size_usd },
    destination_type: p.destination_type,
    destination: p.destination,
  });
}

// ===== subscribe_cascade_risk =====

export const subscribeCascadeRiskTool: ToolDef = {
  name: "subscribe_cascade_risk",
  description:
    "Alert when a simulated X% shock on the given asset would trigger ≥ threshold_usd of liquidations.",
  inputSchema: {
    type: "object",
    properties: {
      asset: { type: "string" },
      stress_pct: { type: "number" },
      threshold_usd: { type: "number" },
      ...destinationSchema,
    },
    required: ["asset", "stress_pct", "threshold_usd", "destination_type", "destination"],
  },
};
const subCascadeIn = z
  .object({
    asset: z.string().min(1),
    stress_pct: z.number(),
    threshold_usd: z.number().positive(),
  })
  .and(destZod);
export async function handleSubscribeCascadeRisk(args: Record<string, unknown>): Promise<unknown> {
  const p = subCascadeIn.parse(args);
  return callApi("/v1/alerts/subscribe", {
    kind: "cascade_risk",
    criteria: { asset: p.asset, stress_pct: p.stress_pct, threshold_usd: p.threshold_usd },
    destination_type: p.destination_type,
    destination: p.destination,
  });
}

// ===== subscribe_funding_extreme =====

export const subscribeFundingExtremeTool: ToolDef = {
  name: "subscribe_funding_extreme",
  description:
    "Alert when the annualized funding rate on an asset crosses ±bps_threshold (in basis points).",
  inputSchema: {
    type: "object",
    properties: {
      asset: { type: "string" },
      bps_threshold: { type: "number", description: "E.g. 5000 = 50% annualized." },
      ...destinationSchema,
    },
    required: ["asset", "bps_threshold", "destination_type", "destination"],
  },
};
const subFundingIn = z
  .object({ asset: z.string().min(1), bps_threshold: z.number().positive() })
  .and(destZod);
export async function handleSubscribeFundingExtreme(
  args: Record<string, unknown>,
): Promise<unknown> {
  const p = subFundingIn.parse(args);
  return callApi("/v1/alerts/subscribe", {
    kind: "funding_extreme",
    criteria: { asset: p.asset, bps_threshold: p.bps_threshold },
    destination_type: p.destination_type,
    destination: p.destination,
  });
}

// ===== cancel_subscription =====

export const cancelSubscriptionTool: ToolDef = {
  name: "cancel_subscription",
  description: "Cancel an alert subscription by its ID.",
  inputSchema: {
    type: "object",
    properties: {
      subscription_id: { type: "string", description: "UUID returned when you subscribed." },
    },
    required: ["subscription_id"],
  },
};
const cancelIn = z.object({ subscription_id: z.string().uuid() });
export async function handleCancelSubscription(args: Record<string, unknown>): Promise<unknown> {
  const p = cancelIn.parse(args);
  return callApi("/v1/alerts/cancel", { subscription_id: p.subscription_id });
}

// ===== extend_subscription =====

export const extendSubscriptionTool: ToolDef = {
  name: "extend_subscription",
  description:
    "Extend an alert subscription's expiry by another 30 days. Pass the subscription_id you received when subscribing.",
  inputSchema: {
    type: "object",
    properties: {
      subscription_id: { type: "string" },
    },
    required: ["subscription_id"],
  },
};
export async function handleExtendSubscription(args: Record<string, unknown>): Promise<unknown> {
  const p = cancelIn.parse(args);
  return callApi("/v1/alerts/extend", { subscription_id: p.subscription_id });
}
