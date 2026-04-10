/**
 * POST /api/agent-scan
 * Autonomous agent scan: fetches REAL market data from Kraken,
 * runs signal detection, AI analysis, guardian validation.
 * This is the "live autonomous agent" endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createKrakenAdapter } from "@/lib/execution/kraken-adapter";
import { getERC8004Adapter } from "@/lib/erc8004/adapter";
import { analyzeTradeOpportunity } from "@/lib/ai/analyst";
import { evaluateTradeIntent } from "@/lib/guardian/engine";
import { detectBreakoutSignal } from "@/lib/strategy/breakout";
import {
  emitSignalDetected, emitTradeIntentCreated, emitAIMemoGenerated,
  emitGuardianChecksCompleted, emitTradeApproved, emitTradeBlocked, emitTradeExecuted,
} from "@/lib/validation/emitter";
import type { MarketSnapshot, AccountState, Position } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const symbols = ["BTC/USD", "ETH/USD"];
  const results = [];
  const kraken = createKrakenAdapter("live"); // Real Kraken API
  const erc8004 = getERC8004Adapter();

  const accountState: AccountState = {
    equity: 100000,
    availableBalance: 94200,
    dailyPnl: 0,
    dailyDrawdown: 0.008,
    openPositionsCount: 0,
    consecutiveLosses: 0,
  };

  for (const symbol of symbols) {
    try {
      // ─── Real market data from Kraken ─────────────────
      const tick = await kraken.getMarketData(symbol);
      const candles = await kraken.getOHLC(symbol, "1h");

      const closes = candles.slice(-50).map(c => c.close);
      const ema50 = closes.reduce((s, c) => s + c, 0) / closes.length;
      const returns = closes.slice(1).map((c, i) => Math.abs(c - closes[i]));
      const atr = returns.slice(-14).reduce((s, r) => s + r, 0) / 14;
      const volumes = candles.slice(-20).map(c => c.volume);
      const avgVol = volumes.reduce((s, v) => s + v, 0) / volumes.length;
      const latestVol = volumes[volumes.length - 1] || avgVol;
      const volumeRatio = avgVol > 0 ? latestVol / avgVol : 1;
      const recentCloses = closes.slice(-20);

      const snapshot: MarketSnapshot = {
        id: uuid(),
        symbol,
        price: tick.last,
        ema50: Math.round(ema50 * 100) / 100,
        atr: Math.round(atr * 100) / 100,
        volumeRatio: Math.round(volumeRatio * 100) / 100,
        support: Math.round(Math.min(...recentCloses) * 100) / 100,
        resistance: Math.round(Math.max(...recentCloses) * 100) / 100,
        regime: "trending",
        spread: Math.round((tick.ask - tick.bid) * 100) / 100,
        timestamp: new Date(),
      };

      // ─── Signal Detection ─────────────────────────────
      const signal = detectBreakoutSignal(snapshot, candles);
      const artifacts = [];

      artifacts.push(await emitSignalDetected(symbol, snapshot));

      if (!signal) {
        results.push({
          symbol,
          status: "no_signal",
          snapshot,
          price: tick.last,
          source: "Kraken REST API",
          artifacts,
        });
        continue;
      }

      // ─── AI Analysis (real OpenAI or deterministic) ───
      const aiAnalysis = await analyzeTradeOpportunity(snapshot, signal);
      snapshot.regime = aiAnalysis.market_regime;
      signal.confidence = aiAnalysis.confidence;
      signal.aiAnalysis = aiAnalysis;
      signal.thesis = aiAnalysis.thesis_summary;
      signal.invalidation = aiAnalysis.invalidation_summary;

      artifacts.push(await emitAIMemoGenerated(signal.id, aiAnalysis));

      // ─── EIP-712 Signing ──────────────────────────────
      const { signature, typedData } = await erc8004.signTradeIntent(signal);
      signal.signature = signature;
      signal.status = "pending_review";

      artifacts.push(await emitTradeIntentCreated(signal));

      // ─── Guardian Validation ──────────────────────────
      const decision = evaluateTradeIntent(signal, accountState, [], snapshot);
      artifacts.push(await emitGuardianChecksCompleted(signal.id, decision));

      let execution = null;
      if (decision.verdict === "APPROVE" || decision.verdict === "APPROVE_WITH_REDUCED_SIZE") {
        signal.status = "approved";
        artifacts.push(await emitTradeApproved(signal.id, decision));

        // Paper trade with real price
        const orderSize = 0.01 * decision.sizeMultiplier;
        const result = await kraken.placeOrder({
          symbol, side: signal.side === "long" ? "buy" : "sell",
          type: "market", size: orderSize,
          stopLoss: signal.stopLoss, takeProfit: signal.takeProfit,
        });

        execution = {
          id: uuid(), tradeIntentId: signal.id,
          broker: "kraken", mode: "live" as const,
          orderId: result.orderId, status: result.status,
          filledPrice: result.filledPrice, filledSize: result.filledSize,
          slippageEstimate: result.filledPrice ? Math.abs(result.filledPrice - signal.entry) / signal.entry : 0,
          createdAt: new Date(),
        };
        signal.status = "filled";
        artifacts.push(await emitTradeExecuted(signal.id, { ...execution, mode: "live" }));
      } else {
        signal.status = "blocked";
        artifacts.push(await emitTradeBlocked(signal.id, decision));
      }

      results.push({
        symbol,
        status: "signal_found",
        snapshot,
        price: tick.last,
        source: "Kraken REST API",
        tradeIntent: signal,
        aiAnalysis,
        guardianDecision: decision,
        execution,
        eip712: { signature, typedData },
        artifacts,
      });
    } catch (err) {
      results.push({
        symbol,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    status: "scan_complete",
    timestamp: new Date().toISOString(),
    adapter: kraken.mode,
    symbolsScanned: symbols.length,
    signalsFound: results.filter(r => r.status === "signal_found").length,
    results,
    registryEvents: erc8004.getEventLog().slice(-20),
  });
}
