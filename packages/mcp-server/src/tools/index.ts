import { getAllAssetCtxsTool, handleGetAllAssetCtxs } from "./getAllAssetCtxs.js";
import { getAssetSnapshotTool, handleGetAssetSnapshot } from "./getAssetSnapshot.js";
import { getFundingDivergenceTool, handleGetFundingDivergence } from "./getFundingDivergence.js";
import { getHlpMetricsTool, handleGetHlpMetrics } from "./getHlpMetrics.js";
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

export const tools: ToolDef[] = [
  getTopLiquidationRisksTool,
  getFundingDivergenceTool,
  getAssetSnapshotTool,
  getAllAssetCtxsTool,
  getHlpMetricsTool,
];

export const toolHandlers: Record<string, ToolHandler> = {
  [getTopLiquidationRisksTool.name]: handleGetTopLiquidationRisks,
  [getFundingDivergenceTool.name]: handleGetFundingDivergence,
  [getAssetSnapshotTool.name]: handleGetAssetSnapshot,
  [getAllAssetCtxsTool.name]: handleGetAllAssetCtxs,
  [getHlpMetricsTool.name]: handleGetHlpMetrics,
};
