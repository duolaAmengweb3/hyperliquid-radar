import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { type DestinationType, SubscriptionDB, type SubscriptionKind } from "./db.js";

const destinationSchema = z.object({
  destination_type: z.enum(["telegram_chat_id", "discord_webhook", "http_webhook"]),
  destination: z.string().min(1),
});

const subscribeSchema = z.intersection(
  destinationSchema,
  z.object({
    kind: z.enum(["wallet", "liq_threshold", "whale_entry", "cascade_risk", "funding_extreme"]),
    criteria: z.record(z.unknown()),
  }),
);

const idSchema = z.object({ subscription_id: z.string().uuid() });

export interface ServerOptions {
  dbPath: string;
  port: number;
}

export function buildServer(opts: ServerOptions): {
  fastify: FastifyInstance;
  db: SubscriptionDB;
} {
  const db = new SubscriptionDB(opts.dbPath);
  const app = Fastify({ logger: { level: "info" } });

  app.get("/health", async () => ({ ok: true, ...db.stats() }));

  app.post("/v1/alerts/subscribe", async (req, reply) => {
    const body = subscribeSchema.safeParse(req.body);
    if (!body.success) {
      reply.code(400);
      return { error: "invalid input", details: body.error.flatten() };
    }
    const sub = db.create(
      body.data.kind as SubscriptionKind,
      body.data.criteria,
      body.data.destination_type as DestinationType,
      body.data.destination,
    );
    return {
      subscription_id: sub.id,
      expires_at: sub.expires_at,
      kind: sub.kind,
    };
  });

  app.post("/v1/alerts/cancel", async (req, reply) => {
    const body = idSchema.safeParse(req.body);
    if (!body.success) {
      reply.code(400);
      return { error: "invalid input" };
    }
    const ok = db.cancel(body.data.subscription_id);
    return { ok };
  });

  app.post("/v1/alerts/extend", async (req, reply) => {
    const body = idSchema.safeParse(req.body);
    if (!body.success) {
      reply.code(400);
      return { error: "invalid input" };
    }
    const newExpiry = db.extend(body.data.subscription_id);
    if (newExpiry === null) {
      reply.code(404);
      return { error: "not found" };
    }
    return { ok: true, expires_at: newExpiry };
  });

  // Telegram webhook — minimal /myid handler so users can discover their chat id.
  app.post("/v1/tg/webhook", async (req) => {
    const update = req.body as {
      message?: { chat?: { id?: number }; text?: string };
    };
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text ?? "";
    if (!chatId) return { ok: true };

    if (text.trim().startsWith("/myid")) {
      const botToken = process.env.TG_BOT_TOKEN;
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Your Telegram chat_id is: ${chatId}\n\nUse it with hyperliquid-radar's subscribe_* tools.`,
          }),
        });
      }
    }
    return { ok: true };
  });

  // Discord interactions webhook — stub (signature verification TBD).
  app.post("/v1/discord/webhook", async () => ({ type: 1 })); // respond to PING

  return { fastify: app, db };
}
