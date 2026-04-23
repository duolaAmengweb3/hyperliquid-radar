import { describe, expect, it } from "vitest";
import { HLClient } from "./client.js";

describe("HLClient", () => {
  it("constructs with default base URL", () => {
    const client = new HLClient();
    expect(client).toBeInstanceOf(HLClient);
  });

  it("accepts custom base URL", () => {
    const client = new HLClient({ baseUrl: "https://example.com" });
    expect(client).toBeInstanceOf(HLClient);
  });
});
