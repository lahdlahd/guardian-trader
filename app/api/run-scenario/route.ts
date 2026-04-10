/**
 * POST /api/run-scenario
 * Body: { scenarioIndex: 0-5 } or { symbol: "BTC/USD", forceConditions: {...} }
 *
 * Runs the full pipeline with forced conditions to reproduce specific guardian outcomes.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createKrakenAdapter } from "@/lib/execution/kraken-adapter";
import { getERC8004Adapter } from "@/lib/erc8004/adapter";
import { analyzeTradeOpportunity } from "@/lib/ai/analyst";
import { evaluateTradeIntent } from "@/lib/guardian/engine";
import {
  emitSignalDetected, emitTradeIntentCreated, emitAIMemoGenerated,
  emitGuardianChecksCompleted, emitTradeApproved, emitTradeBlocked, emitTradeExecuted,
} from "@/lib/validation/emitter";
import type { MarketSnapshot, AccountState, Position, TradeIntent } from "@/lib/types";

// Pre-defined scenarios that force specific guardian outcomes
const FORCED_SCENARIOS = [
  {
    name: "BTC Long — Full Approval",
    symbol: "BTC/USD",
    snapshot: { price: 67450, ema50: 66800, atr: 1250, volumeRatio: 1.35, support: 66000, resistance: 68200, spread: 12 },
    intent: { side: "long" as const, stopLoss: 66200, takeProfit: 69900 },
    account: { equity: 100000, availableBalance: 94200, dailyPnl: 1240, dailyDrawdown: 0.008, openPositionsCount: 0, consecutiveLosses: 0 },
    positions: [],
  },
  {
    name: "ETH Long — Reduced Size (Volatility)",
    symbol: "ETH/USD",
    snapshot: { price: 3520, ema50: 3480, atr: 95, volumeRatio: 1.8, support: 3400, resistance: 3600, spread: 1.2 },
    intent: { side: "long" as const, stopLoss: 3400, takeProfit: 3750 },
    account: { equity: 100000, availableBalance: 94200, dailyPnl: 0, dailyDrawdown: 0.008, openPositionsCount: 1, consecutiveLosses: 0 },
    positions: [],
  },
  {
    name: "BTC Long — Blocked (Daily Drawdown)",
    symbol: "BTC/USD",
    snapshot: { price: 66200, ema50: 66800, atr: 1400, volumeRatio: 1.3, support: 65500, resistance: 67000, spread: 15 },
    intent: { side: "long" as const, stopLoss: 65500, takeProfit: 67800 },
    account: { equity: 100000, availableBalance: 94200, dailyPnl: -3200, dailyDrawdown: 0.032, openPositionsCount: 0, consecutiveLosses: 1 },
    positions: [],
  },
  {
    name: "ETH Long — Blocked (Correlation)",
    symbol: "ETH/USD",
    snapshot: { price: 3380, ema50: 3480, atr: 110, volumeRatio: 1.2, support: 3300, resistance: 3500, spread: 1.5 },
    intent: { side: "long" as const, stopLoss: 3300, takeProfit: 3520 },
    account: { equity: 100000, availableBalance: 90000, dailyPnl: 0, dailyDrawdown: 0.012, openPositionsCount: 1, consecutiveLosses: 0 },
    positions: [{ id: "pos-1", symbol: "BTC/USD", side: "long" as const, entryPrice: 67000, size: 0.015, stopLoss: 66000, takeProfit: 69000, status: "open" as const, openedAt: new Date() }],
  },
  {
    name: "BTC Long — Blocked (No Stop Loss)",
    symbol: "BTC/USD",
    snapshot: { price: 65800, ema50: 66200, atr: 1600, volumeRatio: 2.1, support: 65000, resistance: 67000, spread: 25 },
    intent: { side: "long" as const, stopLoss: 0, takeProfit: 68000 },
    account: { equity: 100000, availableBalance: 100000, dailyPnl: 0, dailyDrawdown: 0.005, openPositionsCount: 0, consecutiveLosses: 0 },
    positions: [],
  },
  {
    name: "ETH Long — Paused (Consecutive Losses)",
    symbol: "ETH/USD",
    snapshot: { price: 3450, ema50: 3440, atr: 85, volumeRatio: 1.1, support: 3380, resistance: 3520, spread: 0.8 },
    intent: { side: "long" as const, stopLoss: 3380, takeProfit: 3580 },
    account: { equity: 100000, availableBalance: 96000, dailyPnl: -1500, dailyDrawdown: 0.021, openPositionsCount: 0, consecutiveLosses: 2 },
    positions: [],
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idx = body.scenarioIndex ?? 0;
    const scenario = FORCED_SCENARIOS[idx] || FORCED_SCENARIOS[0];

    const artifacts = [];
    const kraken = createKrakenAdapter();
    const erc8004 = getERC8004Adapter();

    // Build snapshot
    const snapshot: MarketSnapshot = {
      id: uuid(), symbol: scenario.symbol,
      ...scenario.snapshot,
      regime: "trending",
      timestamp: new Date(),
    };

    artifacts.push(await emitSignalDetected(scenario.symbol, snapshot));

    // AI Analysis
    const aiAnalysis = await analyzeTradeOpportunity(snapshot);
    snapshot.regime = aiAnalysis.market_regime;

    // Build trade intent
    const intent: TradeIntent = {
      id: uuid(), symbol: scenario.symbol,
      side: scenario.intent.side,
      entry: snapshot.price,
      stopLoss: scenario.intent.stopLoss,
      takeProfit: scenario.intent.takeProfit,
      confidence: aiAnalysis.confidence,
      thesis: aiAnalysis.thesis_summary,
      invalidation: aiAnalysis.invalidation_summary,
      proposedSize: 0.01,
      status: "pending_review",
      aiAnalysis,
      createdAt: new Date(),
    };

    // Sign
    const { signature, typedData } = await erc8004.signTradeIntent(intent);
    intent.signature = signature;

    artifacts.push(await emitAIMemoGenerated(intent.id, aiAnalysis));
    artifacts.push(await emitTradeIntentCreated(intent));

    // Guardian
    const decision = evaluateTradeIntent(intent, scenario.account, scenario.positions, snapshot);
    artifacts.push(await emitGuardianChecksCompleted(intent.id, decision));

    let execution = null;
    if (decision.verdict === "APPROVE" || decision.verdict === "APPROVE_WITH_REDUCED_SIZE") {
      intent.status = "approved";
      artifacts.push(await emitTradeApproved(intent.id, decision));
      const size = 0.01 * decision.sizeMultiplier;
      const result = await kraken.placeOrder({ symbol: intent.symbol, side: intent.side === "long" ? "buy" : "sell", type: "market", size, stopLoss: intent.stopLoss, takeProfit: intent.takeProfit });
      execution = { id: uuid(), tradeIntentId: intent.id, broker: "kraken", mode: kraken.mode, ...result, slippageEstimate: result.filledPrice ? Math.abs(result.filledPrice - intent.entry) / intent.entry : 0, createdAt: new Date() };
      intent.status = "filled";
      artifacts.push(await emitTradeExecuted(intent.id, { ...execution, mode: kraken.mode }));
    } else {
      intent.status = "blocked";
      artifacts.push(await emitTradeBlocked(intent.id, decision));
    }

    return NextResponse.json({
      status: "completed",
      scenarioName: scenario.name,
      tradeIntent: intent,
      aiAnalysis,
      guardianDecision: decision,
      execution,
      snapshot,
      artifacts,
      eip712: { signature, typedData },
      registryEvents: erc8004.getEventLog().slice(-10),
      adapter: kraken.mode,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
