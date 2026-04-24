import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 3200);
const dbPath = process.env.DB_PATH ?? "./alerts.db";

const { fastify, db } = buildServer({ port, dbPath });

// Purge expired rows every hour.
setInterval(
  () => {
    const n = db.purgeExpired();
    if (n > 0) fastify.log.info(`purged ${n} expired subscriptions`);
  },
  60 * 60 * 1000,
);

fastify.listen({ port, host: "0.0.0.0" }).catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});

export { buildServer };
