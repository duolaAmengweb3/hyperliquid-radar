import {
  addressPositionHistoryTool,
  handleAddressPositionHistory,
} from "./addressPositionHistory.js";
import {
  assetSnapshotNarrativeTool,
  handleAssetSnapshotNarrative,
} from "./assetSnapshotNarrative.js";
import { comparePerpsTool, handleComparePerps } from "./comparePerps.js";
import { dailyBriefingTool, handleDailyBriefing } from "./dailyBriefing.js";
import { detectAnomaliesTool, handleDetectAnomalies } from "./detectAnomalies.js";
import {
  explainMarketStructureTool,
  handleExplainMarketStructure,
} from "./explainMarketStructure.js";
import { getAllAssetCtxsTool, handleGetAllAssetCtxs } from "./getAllAssetCtxs.js";
import { getAssetSnapshotTool, handleGetAssetSnapshot } from "./getAssetSnapshot.js";
import { getFundingDivergenceTool, handleGetFundingDivergence } from "./getFundingDivergence.js";
import { getFundingPnlTool, handleGetFundingPnl } from "./getFundingPnl.js";
import { getHlpMetricsTool, handleGetHlpMetrics } from "./getHlpMetrics.js";
import { getOrderbookImbalanceTool, handleGetOrderbookImbalance } from "./getOrderbookImbalance.js";
import { getRecentLiquidationsTool, handleGetRecentLiquidations } from "./getRecentLiquidations.js";
import {
  getTopLiquidationRisksTool,
  handleGetTopLiquidationRisks,
} from "./getTopLiquidationRisks.js";
import { getWhaleFlowsTool, handleGetWhaleFlows } from "./getWhaleFlows.js";
import { handleHistoricalContext, historicalContextTool } from "./historicalContext.js";
import { handleLiquidationHeatmap, liquidationHeatmapTool } from "./liquidationHeatmap.js";
import { handleMyPositionRisk, myPositionRiskTool } from "./myPositionRisk.js";
import { handleSimulateCascade, simulateCascadeTool } from "./simulateCascade.js";
import { handleSimulateMyLiqPrice, simulateMyLiqPriceTool } from "./simulateMyLiqPrice.js";
import { handleSmartMoneyFlow, smartMoneyFlowTool } from "./smartMoneyFlow.js";
import { handleWhalePnlLeaderboard, whalePnlLeaderboardTool } from "./whalePnlLeaderboard.js";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export const tools: ToolDef[] = [
  // A. Liquidation Risk
  getTopLiquidationRisksTool,
  liquidationHeatmapTool,
  simulateCascadeTool,
  myPositionRiskTool,
  simulateMyLiqPriceTool,
  getRecentLiquidationsTool,
  // B. Whales & Flow
  whalePnlLeaderboardTool,
  getWhaleFlowsTool,
  addressPositionHistoryTool,
  smartMoneyFlowTool,
  getFundingPnlTool,
  // C. Market Structure
  getFundingDivergenceTool,
  getAssetSnapshotTool,
  getAllAssetCtxsTool,
  getHlpMetricsTool,
  getOrderbookImbalanceTool,
  comparePerpsTool,
  historicalContextTool,
  detectAnomaliesTool,
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
  [simulateMyLiqPriceTool.name]: handleSimulateMyLiqPrice,
  [getRecentLiquidationsTool.name]: handleGetRecentLiquidations,
  [whalePnlLeaderboardTool.name]: handleWhalePnlLeaderboard,
  [getWhaleFlowsTool.name]: handleGetWhaleFlows,
  [addressPositionHistoryTool.name]: handleAddressPositionHistory,
  [smartMoneyFlowTool.name]: handleSmartMoneyFlow,
  [getFundingPnlTool.name]: handleGetFundingPnl,
  [getFundingDivergenceTool.name]: handleGetFundingDivergence,
  [getAssetSnapshotTool.name]: handleGetAssetSnapshot,
  [getAllAssetCtxsTool.name]: handleGetAllAssetCtxs,
  [getHlpMetricsTool.name]: handleGetHlpMetrics,
  [getOrderbookImbalanceTool.name]: handleGetOrderbookImbalance,
  [comparePerpsTool.name]: handleComparePerps,
  [historicalContextTool.name]: handleHistoricalContext,
  [detectAnomaliesTool.name]: handleDetectAnomalies,
  [explainMarketStructureTool.name]: handleExplainMarketStructure,
  [assetSnapshotNarrativeTool.name]: handleAssetSnapshotNarrative,
  [dailyBriefingTool.name]: handleDailyBriefing,
};
