import {
  getTopLiquidationRisksTool,
  handleGetTopLiquidationRisks,
} from "./getTopLiquidationRisks.js";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export const tools: ToolDef[] = [getTopLiquidationRisksTool];

export const toolHandlers: Record<string, ToolHandler> = {
  [getTopLiquidationRisksTool.name]: handleGetTopLiquidationRisks,
};
