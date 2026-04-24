import {
  addressPositionHistoryTool,
  handleAddressPositionHistory,
} from "./addressPositionHistory.js";
import {
  assetSnapshotNarrativeTool,
  handleAssetSnapshotNarrative,
} from "./assetSnapshotNarrative.js";
import { dailyBriefingTool, handleDailyBriefing } from "./dailyBriefing.js";
import {
  explainMarketStructureTool,
  handleExplainMarketStructure,
} from "./explainMarketStructure.js";
import { getAllAssetCtxsTool, handleGetAllAssetCtxs } from "./getAllAssetCtxs.js";
import { getAssetSnapshotTool, handleGetAssetSnapshot } from "./getAssetSnapshot.js";
import { getFundingDivergenceTool, handleGetFundingDivergence } from "./getFundingDivergence.js";
import { getHlpMetricsTool, handleGetHlpMetrics } from "./getHlpMetrics.js";
import { getOrderbookImbalanceTool, handleGetOrderbookImbalance } from "./getOrderbookImbalance.js";
import {
  getTopLiquidationRisksTool,
  handleGetTopLiquidationRisks,
} from "./getTopLiquidationRisks.js";
import { getWhaleFlowsTool, handleGetWhaleFlows } from "./getWhaleFlows.js";
import { handleLiquidationHeatmap, liquidationHeatmapTool } from "./liquidationHeatmap.js";
import { handleMyPositionRisk, myPositionRiskTool } from "./myPositionRisk.js";
import { handleSimulateCascade, simulateCascadeTool } from "./simulateCascade.js";
import { handleSmartMoneyFlow, smartMoneyFlowTool } from "./smartMoneyFlow.js";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// Organised by PRD module order for legibility.
export const tools: ToolDef[] = [
  // A. Liquidation Risk
  getTopLiquidationRisksTool,
  liquidationHeatmapTool,
  simulateCascadeTool,
  myPositionRiskTool,
  // B. Whales & Flow
  getWhaleFlowsTool,
  addressPositionHistoryTool,
  smartMoneyFlowTool,
  // C. Market Structure
  getFundingDivergenceTool,
  getAssetSnapshotTool,
  getAllAssetCtxsTool,
  getHlpMetricsTool,
  getOrderbookImbalanceTool,
  // D. Narrative
  explainMarketStructureTool,
  assetSnapshotNarrativeTool,
  dailyBriefingTool,
];

export const toolHandlers: Record<string, ToolHandler> = {
  [getTopLiquidationRisksTool.name]: handleGetTopLiquidationRisks,
  [liquidationHeatmapTool.name]: handleLiquidationHeatmap,
  [simulateCascadeTool.name]: handleSimulateCascade,
  [myPositionRiskTool.name]: handleMyPositionRisk,
  [getWhaleFlowsTool.name]: handleGetWhaleFlows,
  [addressPositionHistoryTool.name]: handleAddressPositionHistory,
  [smartMoneyFlowTool.name]: handleSmartMoneyFlow,
  [getFundingDivergenceTool.name]: handleGetFundingDivergence,
  [getAssetSnapshotTool.name]: handleGetAssetSnapshot,
  [getAllAssetCtxsTool.name]: handleGetAllAssetCtxs,
  [getHlpMetricsTool.name]: handleGetHlpMetrics,
  [getOrderbookImbalanceTool.name]: handleGetOrderbookImbalance,
  [explainMarketStructureTool.name]: handleExplainMarketStructure,
  [assetSnapshotNarrativeTool.name]: handleAssetSnapshotNarrative,
  [dailyBriefingTool.name]: handleDailyBriefing,
};
