import type { HLClient } from "@cexagent/core";
import type Database from "better-sqlite3";
import { type DestinationType, pushAlert } from "./push.js";

interface SubscriptionRow {
  id: string;
  kind: string;
  criteria_json: string;
  destination_type: DestinationType;
  destination: string;
  last_triggered_at: number | null;
}

/**
 * One polling cycle: load active subscriptions, check each against live HL state,
 * push alerts where criteria are met, and record the trigger.
 *
 * v0.1 implements only funding_extreme. Other kinds are logged as TODO.
 */
export async function runOneCycle(db: Database.Database, client: HLClient): Promise<void> {
  const now = Date.now();
  const subs = db
    .prepare("SELECT * FROM subscriptions WHERE expires_at > ?")
    .all(now) as SubscriptionRow[];

  if (subs.length === 0) return;

  // Batch: fetch HL ctxs once if any funding_extreme / whale_entry subs exist.
  const needsCtxs = subs.some((s) => s.kind === "funding_extreme" || s.kind === "whale_entry");
  const [meta, ctxs] = needsCtxs
    ? await client.getMetaAndAssetCtxs()
    : [{ universe: [] }, [] as Awaited<ReturnType<typeof client.getMetaAndAssetCtxs>>[1]];

  const fiveMin = 5 * 60 * 1000;

  for (const s of subs) {
    // Simple per-subscription debounce: don't fire more than once per 5 minutes.
    if (s.last_triggered_at && now - s.last_triggered_at < fiveMin) continue;

    const criteria = JSON.parse(s.criteria_json) as Record<string, unknown>;

    if (s.kind === "funding_extreme") {
      const asset = criteria.asset as string;
      const bps = Number(criteria.bps_threshold);
      const idx = meta.universe.findIndex((u) => u.name === asset);
      if (idx === -1) continue;
      const fundingAnnualPct = Number(ctxs[idx].funding) * 24 * 365 * 100;
      const fundingBps = fundingAnnualPct * 100;
      if (Math.abs(fundingBps) >= bps) {
        const msg = `⚡ *${asset}* funding hit ${fundingAnnualPct.toFixed(2)}%/yr — threshold ${(bps / 100).toFixed(2)}%/yr`;
        await pushAlert(s.destination_type, s.destination, msg);
        db.prepare(
          "UPDATE subscriptions SET last_triggered_at = ?, trigger_count = trigger_count + 1 WHERE id = ?",
        ).run(now, s.id);
      }
    }

    // TODO v0.2: implement wallet / liq_threshold / whale_entry / cascade_risk checking.
  }
}
