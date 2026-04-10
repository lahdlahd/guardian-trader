/**
 * Validation Artifact Emitter
 *
 * Every major action emits a structured, hashed JSON artifact.
 * Artifacts are submitted to the ERC-8004 Validation Registry.
 */

import { createHash } from "crypto";
import { v4 as uuid } from "uuid";
import { getERC8004Adapter } from "@/lib/erc8004/adapter";
import type { ValidationArtifact, ArtifactType, TradeIntent, GuardianDecision, MarketSnapshot, AIAnalysis } from "@/lib/types";

function sha256(data: string): string {
  return "0x" + createHash("sha256").update(data).digest("hex");
}

async function emit(
  type: ArtifactType,
  entityId: string,
  entityType: string,
  payload: Record<string, unknown>,
  summary: string,
  score?: number
): Promise<ValidationArtifact> {
  const artifact: ValidationArtifact = {
    id: uuid(),
    type,
    entityId,
    entityType,
    payload,
    hash: sha256(JSON.stringify({ type, entityId, payload, ts: Date.now() })),
    score,
    registryStatus: "pending",
    actorId: "agent-001",
    summary,
    createdAt: new Date(),
  };

  // Submit to registry
  const adapter = getERC8004Adapter();
  const { txHash } = await adapter.submitValidationArtifact(artifact);
  artifact.registryStatus = "verified";

  return artifact;
}

// ─── Emitters for each pipeline step ────────────────────────

export async function emitSignalDetected(symbol: string, snapshot: MarketSnapshot): Promise<ValidationArtifact> {
  return emit(
    "signal_detected",
    symbol,
    "MarketSnapshot",
    {
      symbol: snapshot.symbol,
      price: snapshot.price,
      ema50: snapshot.ema50,
      atr: snapshot.atr,
      volumeRatio: snapshot.volumeRatio,
      regime: snapshot.regime,
      support: snapshot.support,
      resistance: snapshot.resistance,
    },
    `Breakout signal detected for ${symbol} at $${snapshot.price.toLocaleString()} in ${snapshot.regime} regime`,
    75
  );
}

export async function emitTradeIntentCreated(intent: TradeIntent): Promise<ValidationArtifact> {
  return emit(
    "trade_intent_created",
    intent.id,
    "TradeIntent",
    {
      symbol: intent.symbol,
      side: intent.side,
      entry: intent.entry,
      stopLoss: intent.stopLoss,
      takeProfit: intent.takeProfit,
      confidence: intent.confidence,
      signature: intent.signature,
    },
    `Trade intent created: ${intent.symbol} ${intent.side} at $${intent.entry.toLocaleString()}`,
    80
  );
}

export async function emitAIMemoGenerated(intentId: string, analysis: AIAnalysis & { source: string }): Promise<ValidationArtifact> {
  return emit(
    "ai_memo_generated",
    intentId,
    "TradeIntent",
    {
      regime: analysis.market_regime,
      confidence: analysis.confidence,
      recommendation: analysis.recommendation,
      source: analysis.source,
      thesis: analysis.thesis_summary,
    },
    `AI analysis: ${analysis.market_regime} regime, ${analysis.confidence} confidence, ${analysis.recommendation} (${analysis.source})`,
    Math.round(analysis.confidence * 100)
  );
}

export async function emitGuardianChecksCompleted(intentId: string, decision: GuardianDecision): Promise<ValidationArtifact> {
  const passed = decision.checks.filter(c => c.passed).length;
  const total = decision.checks.length;
  return emit(
    "guardian_checks_completed",
    intentId,
    "TradeIntent",
    {
      verdict: decision.verdict,
      riskScore: decision.riskScore,
      sizeMultiplier: decision.sizeMultiplier,
      checksPassed: passed,
      checksTotal: total,
      failedChecks: decision.checks.filter(c => !c.passed).map(c => c.name),
      reasons: decision.reasons,
    },
    `Guardian: ${passed}/${total} checks passed, verdict ${decision.verdict}, risk score ${decision.riskScore}`,
    Math.round((passed / total) * 100)
  );
}

export async function emitTradeApproved(intentId: string, decision: GuardianDecision): Promise<ValidationArtifact> {
  return emit(
    "trade_approved",
    intentId,
    "TradeIntent",
    { verdict: decision.verdict, sizeMultiplier: decision.sizeMultiplier },
    `Trade ${decision.verdict === "APPROVE" ? "APPROVED at 100%" : `APPROVED at ${decision.sizeMultiplier * 100}%`} size`,
    90
  );
}

export async function emitTradeBlocked(intentId: string, decision: GuardianDecision): Promise<ValidationArtifact> {
  return emit(
    "trade_blocked",
    intentId,
    "TradeIntent",
    { verdict: decision.verdict, reasons: decision.reasons, riskScore: decision.riskScore },
    `Trade ${decision.verdict === "PAUSE_TRADING" ? "PAUSED" : "BLOCKED"} — ${decision.reasons[0]}`,
    95 // blocking bad trades is high-value
  );
}

export async function emitTradeExecuted(intentId: string, execution: { orderId: string; filledPrice?: number; filledSize?: number; mode: string }): Promise<ValidationArtifact> {
  return emit(
    "trade_executed",
    intentId,
    "TradeIntent",
    { orderId: execution.orderId, filledPrice: execution.filledPrice, filledSize: execution.filledSize, mode: execution.mode },
    `Order ${execution.orderId} filled at $${execution.filledPrice?.toLocaleString()} via ${execution.mode}`,
    85
  );
}

export async function emitTradeClosed(intentId: string, pnl: number, symbol: string): Promise<ValidationArtifact> {
  return emit(
    "trade_closed",
    intentId,
    "TradeIntent",
    { pnl, symbol },
    `Trade closed with ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} P&L`,
    pnl >= 0 ? 85 : 60
  );
}

export async function emitPostTradeReview(intentId: string, review: { score: number; lessons: string[]; source: string }): Promise<ValidationArtifact> {
  return emit(
    "post_trade_review",
    intentId,
    "TradeIntent",
    { score: review.score, lessons: review.lessons, source: review.source },
    `Post-trade review: score ${review.score}/100 (${review.source})`,
    review.score
  );
}
