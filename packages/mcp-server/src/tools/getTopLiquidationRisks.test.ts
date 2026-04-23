import { describe, expect, it } from "vitest";
import { getTopLiquidationRisksTool } from "./getTopLiquidationRisks.js";

describe("getTopLiquidationRisksTool", () => {
  it("has a valid MCP tool definition", () => {
    expect(getTopLiquidationRisksTool.name).toBe("get_top_liquidation_risks");
    expect(getTopLiquidationRisksTool.description).toContain("liquidation");
    expect(getTopLiquidationRisksTool.inputSchema).toBeDefined();
  });

  it("requires addresses in inputSchema", () => {
    const schema = getTopLiquidationRisksTool.inputSchema as {
      required?: string[];
    };
    expect(schema.required).toContain("addresses");
  });
});
