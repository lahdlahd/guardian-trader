/**
 * POST /api/pipeline
 *
 * Runs the full Guardian Trader pipeline:
 * 1. Fetch market data (Kraken adapter)
 * 2. Detect signal (Strategy engine)
 * 3. AI analysis (OpenAI or deterministic)
 * 4. Sign trade intent (EIP-712)
 * 5. Guardian risk validation (10 checks)
 * 6. Execute if approved (Kraken adapter)
 * 7. Emit validation artifacts at every step
 *
 * Body: { symbol: "BTC/USD" | "ETH/USD", accountState?: {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createKrakenAdapter } from "@/lib/execution/kraken-adapter";
import { getERC8004Adapter } from "@/lib/erc8004/adapter";
import { analyzeTradeOpportunity } from "@/lib/ai/analyst";
import { evaluateTradeIntent } from "@/lib/guardian/engine";
import { detectBreakoutSignal } from "@/lib/strategy/breakout";
import {
  emitSignalDetected,
  emitTradeIntentCreated,
  emitAIMemoGenerated,
  emitGuardianChecksCompleted,
  emitTradeApproved,
  emitTradeBlocked,
  emitTradeExecuted,
} from "@/lib/validation/emitter";
import type { MarketSnapshot, AccountState, Position } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbol: string = body.symbol || "BTC/USD";

    const accountState: AccountState = body.accountState || {
      equity: 100000,
      availableBalance: 94200,
      dailyPnl: 0,
      dailyDrawdown: 0.008,
      openPositionsCount: 0,
      consecutiveLosses: 0,
    };

    const openPositions: Position[] = body.openPositions || [];
    const artifacts = [];
    const kraken = createKrakenAdapter();
    const erc8004 = getERC8004Adapter();

    // ─── Step 1: Market Data ──────────────────────────────
    const tick = await kraken.getMarketData(symbol);
    const candles = await kraken.getOHLC(symbol, "1h");

    // Build market snapshot from live data
    const closes = candles.slice(-50).map(c => c.close);
    const ema50 = closes.reduce((s, c) => s + c, 0) / closes.length;
    const returns = closes.slice(1).map((c, i) => Math.abs(c - closes[i]));
    const atr = returns.slice(-14).reduce((s, r) => s + r, 0) / 14;
    const volumes = candles.slice(-20).map(c => c.volume);
    const avgVol = volumes.reduce((s, v) => s + v, 0) / volumes.length;
    const latestVol = volumes[volumes.length - 1] || avgVol;
    const volumeRatio = avgVol > 0 ? latestVol / avgVol : 1;
    const recentHighs = closes.slice(-20);
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentHighs);

    const snapshot: MarketSnapshot = {
      id: uuid(),
      symbol,
      price: tick.last,
      ema50: Math.round(ema50 * 100) / 100,
      atr: Math.round(atr * 100) / 100,
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      regime: "trending", // will be overridden by AI
      spread: Math.round((tick.ask - tick.bid) * 100) / 100,
      timestamp: new Date(),
    };

    // ─── Step 2: Signal Detection ─────────────────────────
    const signal = detectBreakoutSignal(snapshot, candles);

    if (!signal) {
      // No signal — still emit artifact
      artifacts.push(await emitSignalDetected(symbol, snapshot));
      return NextResponse.json({
        status: "no_signal",
        message: `No breakout signal detected for ${symbol}`,
        snapshot,
        artifacts,
        adapter: kraken.mode,
      });
    }

    artifacts.push(await emitSignalDetected(symbol, snapshot));

    // ─── Step 3: AI Analysis ──────────────────────────────
    const aiAnalysis = await analyzeTradeOpportunity(snapshot, signal);
    snapshot.regime = aiAnalysis.market_regime;

    signal.confidence = aiAnalysis.confidence;
    signal.aiAnalysis = aiAnalysis;
    signal.thesis = aiAnalysis.thesis_summary;
    signal.invalidation = aiAnalysis.invalidation_summary;

    artifacts.push(await emitAIMemoGenerated(signal.id, aiAnalysis));

    // ─── Step 4: Sign Trade Intent (EIP-712) ──────────────
    const { signature, typedData } = await erc8004.signTradeIntent(signal);
    signal.signature = signature;
    signal.status = "pending_review";

    artifacts.push(await emitTradeIntentCreated(signal));

    // ─── Step 5: Guardian Risk Validation ──────────────────
    const decision = evaluateTradeIntent(signal, accountState, openPositions, snapshot);

    artifacts.push(await emitGuardianChecksCompleted(signal.id, decision));

    // ─── Step 6: Execute or Block ─────────────────────────
    let execution = null;

    if (decision.verdict === "APPROVE" || decision.verdict === "APPROVE_WITH_REDUCED_SIZE") {
      signal.status = "approved";
      artifacts.push(await emitTradeApproved(signal.id, decision));

      // Execute via Kraken adapter
      const orderSize = signal.proposedSize > 0
        ? signal.proposedSize * decision.sizeMultiplier
        : 0.01 * decision.sizeMultiplier;

      const result = await kraken.placeOrder({
        symbol: signal.symbol,
        side: signal.side === "long" ? "buy" : "sell",
        type: "market",
        size: orderSize,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
      });

      execution = {
        id: uuid(),
        tradeIntentId: signal.id,
        broker: "kraken",
        mode: kraken.mode,
        orderId: result.orderId,
        status: result.status,
        filledPrice: result.filledPrice,
        filledSize: result.filledSize,
        slippageEstimate: result.filledPrice
          ? Math.abs(result.filledPrice - signal.entry) / signal.entry
          : 0,
        createdAt: new Date(),
      };

      signal.status = "filled";
      artifacts.push(await emitTradeExecuted(signal.id, { ...execution, mode: kraken.mode }));
    } else {
      signal.status = "blocked";
      artifacts.push(await emitTradeBlocked(signal.id, decision));
    }

    // ─── Step 7: Update Reputation ────────────────────────
    const totalArtifacts = await erc8004.getAllArtifacts();
    const avgScore = totalArtifacts.length > 0
      ? totalArtifacts.reduce((s, a) => s + (a.score || 0), 0) / totalArtifacts.length
      : 0;

    await erc8004.updateReputation({
      id: uuid(),
      agentId: "agent-001",
      pnlScore: 75,
      drawdownScore: decision.riskScore < 50 ? 90 : 70,
      validationScore: Math.round(avgScore),
      trustScore: Math.round((75 + (decision.riskScore < 50 ? 90 : 70) + avgScore) / 3),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      status: "completed",
      tradeIntent: signal,
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
    console.error("Pipeline error:", err);
    return NextResponse.json(
      { error: "Pipeline failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
