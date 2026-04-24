import { describe, expect, it } from "vitest";
import { getTopLiquidationRisksTool } from "./getTopLiquidationRisks.js";

describe("getTopLiquidationRisksTool", () => {
  it("has a valid MCP tool definition", () => {
    expect(getTopLiquidationRisksTool.name).toBe("get_top_liquidation_risks");
    expect(getTopLiquidationRisksTool.description).toContain("liquidation");
    expect(getTopLiquidationRisksTool.inputSchema).toBeDefined();
  });

  it("accepts optional addresses (seed fallback)", () => {
    const schema = getTopLiquidationRisksTool.inputSchema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.required ?? []).not.toContain("addresses");
    expect(schema.properties).toHaveProperty("addresses");
  });
});
