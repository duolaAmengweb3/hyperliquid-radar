import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

export type DestinationType = "telegram_chat_id" | "discord_webhook" | "http_webhook";

export type SubscriptionKind =
  | "wallet"
  | "liq_threshold"
  | "whale_entry"
  | "cascade_risk"
  | "funding_extreme";

export interface Subscription {
  id: string;
  kind: SubscriptionKind;
  criteria: Record<string, unknown>;
  destination_type: DestinationType;
  destination: string;
  created_at: number;
  expires_at: number;
  last_triggered_at: number | null;
  trigger_count: number;
}

interface Row {
  id: string;
  kind: SubscriptionKind;
  criteria_json: string;
  destination_type: DestinationType;
  destination: string;
  created_at: number;
  expires_at: number;
  last_triggered_at: number | null;
  trigger_count: number;
}

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class SubscriptionDB {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        criteria_json TEXT NOT NULL,
        destination_type TEXT NOT NULL,
        destination TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        last_triggered_at INTEGER,
        trigger_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sub_kind ON subscriptions(kind);
      CREATE INDEX IF NOT EXISTS idx_sub_expires ON subscriptions(expires_at);
    `);
  }

  create(
    kind: SubscriptionKind,
    criteria: Record<string, unknown>,
    destinationType: DestinationType,
    destination: string,
  ): Subscription {
    const now = Date.now();
    const sub: Subscription = {
      id: randomUUID(),
      kind,
      criteria,
      destination_type: destinationType,
      destination,
      created_at: now,
      expires_at: now + TTL_MS,
      last_triggered_at: null,
      trigger_count: 0,
    };
    this.db
      .prepare(
        "INSERT INTO subscriptions (id, kind, criteria_json, destination_type, destination, created_at, expires_at, last_triggered_at, trigger_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        sub.id,
        sub.kind,
        JSON.stringify(sub.criteria),
        sub.destination_type,
        sub.destination,
        sub.created_at,
        sub.expires_at,
        sub.last_triggered_at,
        sub.trigger_count,
      );
    return sub;
  }

  cancel(id: string): boolean {
    const res = this.db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
    return res.changes > 0;
  }

  extend(id: string): number | null {
    const newExpiry = Date.now() + TTL_MS;
    const res = this.db
      .prepare("UPDATE subscriptions SET expires_at = ? WHERE id = ?")
      .run(newExpiry, id);
    return res.changes > 0 ? newExpiry : null;
  }

  activeByKind(kind: SubscriptionKind): Subscription[] {
    const rows = this.db
      .prepare("SELECT * FROM subscriptions WHERE kind = ? AND expires_at > ?")
      .all(kind, Date.now()) as Row[];
    return rows.map(this.rowToSub);
  }

  purgeExpired(): number {
    const res = this.db.prepare("DELETE FROM subscriptions WHERE expires_at <= ?").run(Date.now());
    return res.changes;
  }

  recordTrigger(id: string): void {
    this.db
      .prepare(
        "UPDATE subscriptions SET last_triggered_at = ?, trigger_count = trigger_count + 1 WHERE id = ?",
      )
      .run(Date.now(), id);
  }

  stats(): { total: number; active: number; by_kind: Record<string, number> } {
    const now = Date.now();
    const total = (
      this.db.prepare("SELECT COUNT(*) as n FROM subscriptions").get() as { n: number }
    ).n;
    const active = (
      this.db.prepare("SELECT COUNT(*) as n FROM subscriptions WHERE expires_at > ?").get(now) as {
        n: number;
      }
    ).n;
    const byKind = this.db
      .prepare("SELECT kind, COUNT(*) as n FROM subscriptions WHERE expires_at > ? GROUP BY kind")
      .all(now) as Array<{ kind: string; n: number }>;
    return {
      total,
      active,
      by_kind: Object.fromEntries(byKind.map((r) => [r.kind, r.n])),
    };
  }

  private rowToSub(row: Row): Subscription {
    return {
      id: row.id,
      kind: row.kind,
      criteria: JSON.parse(row.criteria_json),
      destination_type: row.destination_type,
      destination: row.destination,
      created_at: row.created_at,
      expires_at: row.expires_at,
      last_triggered_at: row.last_triggered_at,
      trigger_count: row.trigger_count,
    };
  }
}
