import { HLClient } from "@cexagent/core";
import Database from "better-sqlite3";
import { runOneCycle } from "./checker.js";

const DB_PATH = process.env.DB_PATH ?? "./alerts.db";
const INTERVAL_MS = Number(process.env.CHECK_INTERVAL_MS ?? 60_000);

console.log(`[alert-daemon] starting: db=${DB_PATH} interval=${INTERVAL_MS}ms`);

const db = new Database(DB_PATH, { readonly: false });
db.pragma("journal_mode = WAL");

const client = new HLClient();

async function loop(): Promise<void> {
  try {
    await runOneCycle(db, client);
  } catch (err) {
    console.error("[alert-daemon] cycle failed:", err);
  }
}

// Immediate tick, then interval.
loop();
setInterval(loop, INTERVAL_MS);

process.on("SIGTERM", () => {
  console.log("[alert-daemon] SIGTERM, closing db");
  db.close();
  process.exit(0);
});
