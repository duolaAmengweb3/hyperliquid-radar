export type DestinationType = "telegram_chat_id" | "discord_webhook" | "http_webhook";

export async function pushAlert(
  destinationType: DestinationType,
  destination: string,
  message: string,
): Promise<void> {
  switch (destinationType) {
    case "telegram_chat_id": {
      const token = process.env.TG_BOT_TOKEN;
      if (!token) {
        console.warn("[push] TG_BOT_TOKEN not set, skipping TG push");
        return;
      }
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: destination,
          text: message,
          parse_mode: "Markdown",
        }),
      });
      return;
    }
    case "discord_webhook":
    case "http_webhook": {
      await fetch(destination, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          destinationType === "discord_webhook" ? { content: message } : { message },
        ),
      });
      return;
    }
  }
}
