/**
 * Guardian Risk Engine
 *
 * Deterministic validation of every trade intent.
 * No trade executes without passing through this layer.
 */

import type {
  TradeIntent,
  AccountState,
  Position,
  MarketSnapshot,
  GuardianDecision,
  GuardianCheck,
  GuardianVerdict,
  RiskPolicy,
} from "@/lib/types";
import { v4 as uuid } from "uuid";

const DEFAULT_POLICY: RiskPolicy = {
  maxRiskPerTrade: 0.01,
  maxDailyDrawdown: 0.03,
  maxOpenPositions: 2,
  minConfidence: 0.65,
  volatilityReduceThreshold: 1.5,
  volatilitySizeMultiplier: 0.5,
  consecutiveLossCooldown: 2,
  whitelistedSymbols: ["BTC/USD", "ETH/USD"],
  maxSpreadPct: 0.005,
  maxCorrelationExposure: 0.7,
  maxLeverage: 1,
};

export function evaluateTradeIntent(
  intent: TradeIntent,
  account: AccountState,
  positions: Position[],
  market: MarketSnapshot,
  policy: RiskPolicy = DEFAULT_POLICY
): GuardianDecision {
  const checks: GuardianCheck[] = [];
  const reasons: string[] = [];
  let sizeMultiplier = 1.0;
  let shouldBlock = false;
  let shouldPause = false;

  // 1. Stop-loss present
  const hasStopLoss = intent.stopLoss > 0;
  checks.push({
    name: "Stop-Loss Present",
    passed: hasStopLoss,
    severity: "critical",
    message: hasStopLoss ? `Stop-loss set at $${intent.stopLoss.toLocaleString()}` : "NO STOP-LOSS DEFINED",
    value: hasStopLoss ? `$${intent.stopLoss.toLocaleString()}` : "None",
    threshold: "Required",
  });
  if (!hasStopLoss) {
    shouldBlock = true;
    reasons.push("BLOCKED: No stop-loss defined. Every trade MUST have a stop-loss.");
  }

  // 2. Risk per trade
  const riskPerUnit = hasStopLoss ? Math.abs(intent.entry - intent.stopLoss) : Infinity;
  const riskPct = hasStopLoss ? (riskPerUnit * intent.proposedSize) / account.equity : Infinity;
  const riskOk = riskPct <= policy.maxRiskPerTrade;
  checks.push({
    name: "Risk Per Trade",
    passed: riskOk,
    severity: "critical",
    message: hasStopLoss ? `Risk is ${(riskPct * 100).toFixed(2)}% of equity` : "Cannot calculate without stop-loss",
    value: hasStopLoss ? `${(riskPct * 100).toFixed(2)}%` : "∞",
    threshold: `≤${policy.maxRiskPerTrade * 100}%`,
  });
  if (!riskOk) {
    shouldBlock = true;
    reasons.push(`Risk per trade ${(riskPct * 100).toFixed(2)}% exceeds ${policy.maxRiskPerTrade * 100}% limit.`);
  }

  // 3. Daily drawdown
  const ddOk = account.dailyDrawdown <= policy.maxDailyDrawdown;
  checks.push({
    name: "Daily Drawdown",
    passed: ddOk,
    severity: "critical",
    message: `Current drawdown ${(account.dailyDrawdown * 100).toFixed(1)}%`,
    value: `${(account.dailyDrawdown * 100).toFixed(1)}%`,
    threshold: `≤${policy.maxDailyDrawdown * 100}%`,
  });
  if (!ddOk) {
    shouldBlock = true;
    reasons.push(`Daily drawdown ${(account.dailyDrawdown * 100).toFixed(1)}% exceeds ${policy.maxDailyDrawdown * 100}% limit.`);
  }

  // 4. Volatility
  const volRatio = market.atr / (market.price * 0.01); // normalized
  const volOk = volRatio <= policy.volatilityReduceThreshold;
  checks.push({
    name: "Volatility Check",
    passed: volOk,
    severity: "warning",
    message: volOk
      ? `ATR ratio ${volRatio.toFixed(2)}, within normal range`
      : `ATR ratio ${volRatio.toFixed(2)} exceeds threshold — reducing size by ${(1 - policy.volatilitySizeMultiplier) * 100}%`,
    value: volRatio.toFixed(2),
    threshold: `≤${policy.volatilityReduceThreshold}`,
  });
  if (!volOk) {
    sizeMultiplier = Math.min(sizeMultiplier, policy.volatilitySizeMultiplier);
    reasons.push(`Volatility exceeds threshold. Position size reduced to ${policy.volatilitySizeMultiplier * 100}%.`);
  }

  // 5. Confidence threshold
  const confOk = intent.confidence >= policy.minConfidence;
  checks.push({
    name: "Confidence Threshold",
    passed: confOk,
    severity: "critical",
    message: `Confidence ${intent.confidence} ${confOk ? "above" : "below"} minimum`,
    value: String(intent.confidence),
    threshold: `≥${policy.minConfidence}`,
  });
  if (!confOk) {
    shouldBlock = true;
    reasons.push(`Confidence ${intent.confidence} below ${policy.minConfidence} minimum.`);
  }

  // 6. Open positions
  const posOk = account.openPositionsCount < policy.maxOpenPositions;
  checks.push({
    name: "Open Positions",
    passed: posOk,
    severity: "warning",
    message: `${account.openPositionsCount} open position(s)`,
    value: String(account.openPositionsCount),
    threshold: `≤${policy.maxOpenPositions}`,
  });
  if (!posOk) {
    shouldBlock = true;
    reasons.push(`Max open positions (${policy.maxOpenPositions}) reached.`);
  }

  // 7. Correlation exposure
  const hasSameDirectionCrypto = positions.some(
    (p) => p.status === "open" && p.side === intent.side && p.symbol !== intent.symbol
  );
  const corrExposure = hasSameDirectionCrypto ? 0.85 : 0;
  const corrOk = corrExposure <= policy.maxCorrelationExposure;
  checks.push({
    name: "Correlation Exposure",
    passed: corrOk,
    severity: hasSameDirectionCrypto ? "critical" : "warning",
    message: hasSameDirectionCrypto
      ? `Correlation ${corrExposure} with existing position exceeds limit`
      : "No correlated positions",
    value: corrExposure.toFixed(2),
    threshold: `≤${policy.maxCorrelationExposure}`,
  });
  if (!corrOk) {
    shouldBlock = true;
    reasons.push(`Correlation exposure ${corrExposure} exceeds ${policy.maxCorrelationExposure} threshold.`);
  }

  // 8. Consecutive losses
  const cooldownActive = account.consecutiveLosses >= policy.consecutiveLossCooldown;
  checks.push({
    name: "Consecutive Losses",
    passed: !cooldownActive,
    severity: cooldownActive ? "critical" : "info",
    message: cooldownActive
      ? `${account.consecutiveLosses} consecutive losses — COOLDOWN ACTIVATED`
      : `${account.consecutiveLosses} consecutive losses`,
    value: String(account.consecutiveLosses),
    threshold: `≤${policy.consecutiveLossCooldown}`,
  });
  if (cooldownActive) {
    shouldPause = true;
    reasons.push(`Trading paused: ${account.consecutiveLosses} consecutive losses triggered cooldown.`);
  }

  // 9. Spread/Slippage
  const spreadPct = market.spread / market.price;
  const spreadOk = spreadPct <= policy.maxSpreadPct;
  checks.push({
    name: "Spread/Slippage",
    passed: spreadOk,
    severity: "warning",
    message: spreadOk ? `Spread acceptable` : `Spread elevated`,
    value: `${(spreadPct * 100).toFixed(2)}%`,
    threshold: `≤${(policy.maxSpreadPct * 100).toFixed(1)}%`,
  });

  // 10. Symbol whitelist
  const whitelisted = policy.whitelistedSymbols.includes(intent.symbol);
  checks.push({
    name: "Symbol Whitelisted",
    passed: whitelisted,
    severity: "critical",
    message: whitelisted ? `${intent.symbol} is whitelisted` : `${intent.symbol} NOT whitelisted`,
    value: intent.symbol,
    threshold: "Whitelist",
  });
  if (!whitelisted) {
    shouldBlock = true;
    reasons.push(`Symbol ${intent.symbol} is not in the whitelist.`);
  }

  // ─── Final Verdict ──────────────────────────────────────
  let verdict: GuardianVerdict;
  if (shouldPause) {
    verdict = "PAUSE_TRADING";
    sizeMultiplier = 0;
  } else if (shouldBlock) {
    verdict = "BLOCK";
    sizeMultiplier = 0;
  } else if (sizeMultiplier < 1) {
    verdict = "APPROVE_WITH_REDUCED_SIZE";
  } else {
    verdict = "APPROVE";
    reasons.push("All risk checks passed. Trade approved at full size.");
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const riskScore = Math.round(100 - (passedCount / checks.length) * 100 + (shouldBlock ? 20 : 0));

  return {
    id: uuid(),
    tradeIntentId: intent.id,
    verdict,
    sizeMultiplier,
    riskScore: Math.min(100, Math.max(0, riskScore)),
    checks,
    reasons,
    auditSummary: `Trade intent ${intent.id} for ${intent.symbol} ${intent.side}: ${passedCount}/${checks.length} checks passed. Verdict: ${verdict}.`,
    createdAt: new Date(),
  };
}

export function computePositionSize(
  equity: number,
  maxRiskPct: number,
  entry: number,
  stopLoss: number
): number {
  if (stopLoss <= 0 || entry <= 0) return 0;
  const riskPerUnit = Math.abs(entry - stopLoss);
  const maxRiskAmount = equity * maxRiskPct;
  return maxRiskAmount / riskPerUnit;
}
