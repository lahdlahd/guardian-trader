import {
  type TradeIntent,
  type GuardianDecision,
  type MarketSnapshot,
  type OrderExecution,
  type Position,
  type ValidationArtifact,
  type DailyMetrics,
  type AgentIdentity,
  type ReputationScore,
  type AccountState,
  type RiskPolicy,
  type DemoScenario,
} from "@/lib/types";

// ─── Agent ──────────────────────────────────────────────────
export const AGENT: AgentIdentity = {
  id: "agent-001",
  name: "Guardian Trader Alpha",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  capabilities: [
    "spot_trading",
    "risk_management",
    "signal_detection",
    "ai_analysis",
    "validation_emission",
  ],
  status: "active",
  registryTxHash: "0xabc123def456789...mock",
  createdAt: new Date("2025-06-01"),
};

export const REPUTATION: ReputationScore = {
  id: "rep-001",
  agentId: "agent-001",
  pnlScore: 78,
  drawdownScore: 92,
  validationScore: 88,
  trustScore: 85,
  updatedAt: new Date(),
};

export const RISK_POLICY: RiskPolicy = {
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

export const ACCOUNT_STATE: AccountState = {
  equity: 100000,
  availableBalance: 94200,
  dailyPnl: 1240,
  dailyDrawdown: 0.008,
  openPositionsCount: 1,
  consecutiveLosses: 0,
};

// ─── Helper ─────────────────────────────────────────────────
const h = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600000);
const uid = (n: number) => `demo-${String(n).padStart(3, "0")}`;

// ─── Market Snapshots ───────────────────────────────────────
export const SNAPSHOTS: MarketSnapshot[] = [
  {
    id: uid(100),
    symbol: "BTC/USD",
    price: 67450,
    ema50: 66800,
    atr: 1250,
    volumeRatio: 1.35,
    support: 66000,
    resistance: 68200,
    regime: "trending",
    spread: 12,
    timestamp: h(2),
  },
  {
    id: uid(101),
    symbol: "ETH/USD",
    price: 3520,
    ema50: 3480,
    atr: 95,
    volumeRatio: 1.8,
    support: 3400,
    resistance: 3600,
    regime: "volatile",
    spread: 1.2,
    timestamp: h(1.5),
  },
  {
    id: uid(102),
    symbol: "BTC/USD",
    price: 66200,
    ema50: 66800,
    atr: 1400,
    volumeRatio: 0.9,
    support: 65500,
    resistance: 67000,
    regime: "ranging",
    spread: 15,
    timestamp: h(5),
  },
  {
    id: uid(103),
    symbol: "ETH/USD",
    price: 3380,
    ema50: 3480,
    atr: 110,
    volumeRatio: 1.2,
    support: 3300,
    resistance: 3500,
    regime: "volatile",
    spread: 1.5,
    timestamp: h(4),
  },
  {
    id: uid(104),
    symbol: "BTC/USD",
    price: 65800,
    ema50: 66200,
    atr: 1600,
    volumeRatio: 2.1,
    support: 65000,
    resistance: 67000,
    regime: "panic",
    spread: 25,
    timestamp: h(8),
  },
  {
    id: uid(105),
    symbol: "ETH/USD",
    price: 3450,
    ema50: 3440,
    atr: 85,
    volumeRatio: 1.1,
    support: 3380,
    resistance: 3520,
    regime: "trending",
    spread: 0.8,
    timestamp: h(0.5),
  },
];

// ─── 6 Demo Scenarios ───────────────────────────────────────

function makeArtifacts(
  intentId: string,
  types: [string, string][],
  base: number
): ValidationArtifact[] {
  return types.map(([type, summary], i) => ({
    id: uid(base + i),
    type: type as ValidationArtifact["type"],
    entityId: intentId,
    entityType: "TradeIntent",
    payload: { scenario: intentId },
    hash: `0x${Math.random().toString(16).slice(2, 18)}`,
    score: 80 + Math.random() * 20,
    registryStatus: "verified" as const,
    actorId: "agent-001",
    summary,
    createdAt: h(2 - i * 0.1),
  }));
}

// --- Scenario 1: BTC Long Approved ---
const s1Intent: TradeIntent = {
  id: uid(1),
  symbol: "BTC/USD",
  side: "long",
  entry: 67450,
  stopLoss: 66200,
  takeProfit: 69900,
  confidence: 0.82,
  thesis:
    "BTC breaking above resistance at $68,200 with volume confirmation. EMA50 trending up. Momentum supports continuation.",
  invalidation: "Close below $66,200 invalidates the breakout thesis.",
  proposedSize: 0.015,
  status: "filled",
  aiAnalysis: {
    market_regime: "trending",
    confidence: 0.82,
    thesis_summary:
      "Strong breakout with volume. Trend-following entry with clean risk/reward.",
    invalidation_summary:
      "Invalidated on close below prior range support at $66,200.",
    recommendation: "favorable",
  },
  signature: "0xmock_eip712_sig_scenario_1",
  createdAt: h(2),
};

const s1Decision: GuardianDecision = {
  id: uid(11),
  tradeIntentId: uid(1),
  verdict: "APPROVE",
  sizeMultiplier: 1.0,
  riskScore: 22,
  checks: [
    { name: "Stop-Loss Present", passed: true, severity: "critical", message: "Stop-loss set at $66,200", value: "$66,200", threshold: "Required" },
    { name: "Risk Per Trade", passed: true, severity: "critical", message: "Risk is 0.74% of equity", value: "0.74%", threshold: "≤1%" },
    { name: "Daily Drawdown", passed: true, severity: "critical", message: "Current drawdown 0.8%", value: "0.8%", threshold: "≤3%" },
    { name: "Volatility Check", passed: true, severity: "warning", message: "ATR ratio 1.08, within normal range", value: "1.08", threshold: "≤1.5" },
    { name: "Confidence Threshold", passed: true, severity: "critical", message: "Confidence 0.82 exceeds minimum", value: "0.82", threshold: "≥0.65" },
    { name: "Open Positions", passed: true, severity: "warning", message: "1 open position, limit is 2", value: "1", threshold: "≤2" },
    { name: "Correlation Exposure", passed: true, severity: "warning", message: "No correlated positions", value: "0.0", threshold: "≤0.7" },
    { name: "Consecutive Losses", passed: true, severity: "info", message: "No recent consecutive losses", value: "0", threshold: "≤2" },
    { name: "Spread/Slippage", passed: true, severity: "warning", message: "Spread $12, acceptable", value: "0.02%", threshold: "≤0.5%" },
    { name: "Symbol Whitelisted", passed: true, severity: "critical", message: "BTC/USD is whitelisted", value: "BTC/USD", threshold: "Whitelist" },
  ],
  reasons: ["All risk checks passed. Trade approved at full size."],
  auditSummary:
    "Trade intent demo-001 for BTC/USD long passed all 10 guardian checks. Risk score 22/100 (low risk). Approved at 100% size.",
  createdAt: h(1.9),
};

// --- Scenario 2: ETH Long at 50% Size (Volatility) ---
const s2Intent: TradeIntent = {
  id: uid(2),
  symbol: "ETH/USD",
  side: "long",
  entry: 3520,
  stopLoss: 3400,
  takeProfit: 3750,
  confidence: 0.71,
  thesis:
    "ETH testing resistance at $3,600. Volume surge 1.8x average suggests breakout potential.",
  invalidation: "Failure to hold $3,400 support invalidates the setup.",
  proposedSize: 0.5,
  status: "filled",
  aiAnalysis: {
    market_regime: "volatile",
    confidence: 0.71,
    thesis_summary:
      "Potential breakout but elevated volatility warrants caution.",
    invalidation_summary: "Sharp rejection below $3,400 kills thesis.",
    recommendation: "cautious",
  },
  signature: "0xmock_eip712_sig_scenario_2",
  createdAt: h(1.5),
};

const s2Decision: GuardianDecision = {
  id: uid(12),
  tradeIntentId: uid(2),
  verdict: "APPROVE_WITH_REDUCED_SIZE",
  sizeMultiplier: 0.5,
  riskScore: 48,
  checks: [
    { name: "Stop-Loss Present", passed: true, severity: "critical", message: "Stop-loss at $3,400", value: "$3,400", threshold: "Required" },
    { name: "Risk Per Trade", passed: true, severity: "critical", message: "Risk 0.91% (after size reduction)", value: "0.91%", threshold: "≤1%" },
    { name: "Daily Drawdown", passed: true, severity: "critical", message: "Drawdown 0.8%", value: "0.8%", threshold: "≤3%" },
    { name: "Volatility Check", passed: false, severity: "warning", message: "ATR ratio 1.72 exceeds threshold — reducing size by 50%", value: "1.72", threshold: "≤1.5" },
    { name: "Confidence Threshold", passed: true, severity: "critical", message: "Confidence 0.71 above minimum", value: "0.71", threshold: "≥0.65" },
    { name: "Open Positions", passed: true, severity: "warning", message: "1 open position", value: "1", threshold: "≤2" },
    { name: "Correlation Exposure", passed: true, severity: "warning", message: "Moderate crypto correlation 0.62", value: "0.62", threshold: "≤0.7" },
    { name: "Consecutive Losses", passed: true, severity: "info", message: "0 consecutive losses", value: "0", threshold: "≤2" },
    { name: "Spread/Slippage", passed: true, severity: "warning", message: "Spread $1.20, acceptable", value: "0.03%", threshold: "≤0.5%" },
    { name: "Symbol Whitelisted", passed: true, severity: "critical", message: "ETH/USD whitelisted", value: "ETH/USD", threshold: "Whitelist" },
  ],
  reasons: [
    "Volatility exceeds threshold (ATR ratio 1.72 > 1.5). Position size reduced by 50%.",
    "All other checks passed.",
  ],
  auditSummary:
    "Trade intent demo-002 for ETH/USD long: 9/10 checks passed. Volatility flag triggered adaptive size reduction. Approved at 50% of proposed size.",
  createdAt: h(1.4),
};

// --- Scenario 3: BTC Blocked — Daily Drawdown ---
const s3Intent: TradeIntent = {
  id: uid(3),
  symbol: "BTC/USD",
  side: "long",
  entry: 66200,
  stopLoss: 65500,
  takeProfit: 67800,
  confidence: 0.75,
  thesis: "BTC bouncing off EMA50 support in a ranging market. Scalp opportunity.",
  invalidation: "Break below $65,500 signals bearish continuation.",
  proposedSize: 0.02,
  status: "blocked",
  aiAnalysis: {
    market_regime: "ranging",
    confidence: 0.75,
    thesis_summary: "EMA50 bounce in range. Moderate confidence.",
    invalidation_summary: "Loss of $65,500 level.",
    recommendation: "cautious",
  },
  signature: "0xmock_eip712_sig_scenario_3",
  createdAt: h(5),
};

const s3Decision: GuardianDecision = {
  id: uid(13),
  tradeIntentId: uid(3),
  verdict: "BLOCK",
  sizeMultiplier: 0,
  riskScore: 78,
  checks: [
    { name: "Stop-Loss Present", passed: true, severity: "critical", message: "Stop-loss at $65,500", value: "$65,500", threshold: "Required" },
    { name: "Risk Per Trade", passed: true, severity: "critical", message: "Risk 0.70%", value: "0.70%", threshold: "≤1%" },
    { name: "Daily Drawdown", passed: false, severity: "critical", message: "Daily drawdown 3.2% EXCEEDS 3% limit", value: "3.2%", threshold: "≤3%" },
    { name: "Volatility Check", passed: true, severity: "warning", message: "Normal", value: "1.1", threshold: "≤1.5" },
    { name: "Confidence Threshold", passed: true, severity: "critical", message: "0.75 ≥ 0.65", value: "0.75", threshold: "≥0.65" },
    { name: "Open Positions", passed: true, severity: "warning", message: "0 open", value: "0", threshold: "≤2" },
    { name: "Correlation Exposure", passed: true, severity: "warning", message: "No positions", value: "0.0", threshold: "≤0.7" },
    { name: "Consecutive Losses", passed: true, severity: "info", message: "1 consecutive loss", value: "1", threshold: "≤2" },
    { name: "Spread/Slippage", passed: true, severity: "warning", message: "Acceptable", value: "0.02%", threshold: "≤0.5%" },
    { name: "Symbol Whitelisted", passed: true, severity: "critical", message: "BTC/USD whitelisted", value: "BTC/USD", threshold: "Whitelist" },
  ],
  reasons: [
    "BLOCKED: Daily drawdown of 3.2% exceeds the maximum allowed 3%. No new trades permitted until drawdown recovers.",
  ],
  auditSummary:
    "Trade intent demo-003 BLOCKED. Daily loss limit breached. Guardian protected capital by preventing additional exposure.",
  createdAt: h(4.9),
};

// --- Scenario 4: ETH Blocked — Correlation Exposure ---
const s4Intent: TradeIntent = {
  id: uid(4),
  symbol: "ETH/USD",
  side: "long",
  entry: 3380,
  stopLoss: 3300,
  takeProfit: 3520,
  confidence: 0.69,
  thesis: "ETH support bounce. Correlated momentum with existing BTC position.",
  invalidation: "Below $3,300 signals broader crypto weakness.",
  proposedSize: 0.3,
  status: "blocked",
  aiAnalysis: {
    market_regime: "volatile",
    confidence: 0.69,
    thesis_summary: "Support level bounce with crypto momentum.",
    invalidation_summary: "Loss of $3,300 in volatile regime.",
    recommendation: "cautious",
  },
  signature: "0xmock_eip712_sig_scenario_4",
  createdAt: h(4),
};

const s4Decision: GuardianDecision = {
  id: uid(14),
  tradeIntentId: uid(4),
  verdict: "BLOCK",
  sizeMultiplier: 0,
  riskScore: 72,
  checks: [
    { name: "Stop-Loss Present", passed: true, severity: "critical", message: "Stop-loss at $3,300", value: "$3,300", threshold: "Required" },
    { name: "Risk Per Trade", passed: true, severity: "critical", message: "Risk 0.68%", value: "0.68%", threshold: "≤1%" },
    { name: "Daily Drawdown", passed: true, severity: "critical", message: "1.2%", value: "1.2%", threshold: "≤3%" },
    { name: "Volatility Check", passed: false, severity: "warning", message: "ATR elevated at 1.58", value: "1.58", threshold: "≤1.5" },
    { name: "Confidence Threshold", passed: true, severity: "critical", message: "0.69 ≥ 0.65", value: "0.69", threshold: "≥0.65" },
    { name: "Open Positions", passed: true, severity: "warning", message: "1 open (BTC long)", value: "1", threshold: "≤2" },
    { name: "Correlation Exposure", passed: false, severity: "critical", message: "Correlation 0.85 with existing BTC position EXCEEDS 0.7 limit", value: "0.85", threshold: "≤0.7" },
    { name: "Consecutive Losses", passed: true, severity: "info", message: "0", value: "0", threshold: "≤2" },
    { name: "Spread/Slippage", passed: true, severity: "warning", message: "Acceptable", value: "0.04%", threshold: "≤0.5%" },
    { name: "Symbol Whitelisted", passed: true, severity: "critical", message: "ETH/USD whitelisted", value: "ETH/USD", threshold: "Whitelist" },
  ],
  reasons: [
    "BLOCKED: Correlation exposure 0.85 with existing BTC/USD long exceeds 0.7 threshold.",
    "Adding ETH long while BTC long is open creates concentrated crypto directional risk.",
  ],
  auditSummary:
    "Trade intent demo-004 BLOCKED. High correlation with existing BTC position. Guardian prevented portfolio concentration risk.",
  createdAt: h(3.9),
};

// --- Scenario 5: BTC Blocked — Missing Stop Loss ---
const s5Intent: TradeIntent = {
  id: uid(5),
  symbol: "BTC/USD",
  side: "long",
  entry: 65800,
  stopLoss: 0,
  takeProfit: 68000,
  confidence: 0.77,
  thesis: "Panic selling exhaustion. Aggressive reversal play.",
  invalidation: "Continued selling pressure below $65,000.",
  proposedSize: 0.025,
  status: "blocked",
  aiAnalysis: {
    market_regime: "panic",
    confidence: 0.77,
    thesis_summary: "Bottom-fishing in panic regime. High risk/reward.",
    invalidation_summary: "New lows below $65,000.",
    recommendation: "avoid",
  },
  signature: "0xmock_eip712_sig_scenario_5",
  createdAt: h(8),
};

const s5Decision: GuardianDecision = {
  id: uid(15),
  tradeIntentId: uid(5),
  verdict: "BLOCK",
  sizeMultiplier: 0,
  riskScore: 95,
  checks: [
    { name: "Stop-Loss Present", passed: false, severity: "critical", message: "NO STOP-LOSS DEFINED. This is a hard requirement.", value: "None", threshold: "Required" },
    { name: "Risk Per Trade", passed: false, severity: "critical", message: "Cannot calculate risk without stop-loss", value: "∞", threshold: "≤1%" },
    { name: "Daily Drawdown", passed: true, severity: "critical", message: "0.5%", value: "0.5%", threshold: "≤3%" },
    { name: "Volatility Check", passed: false, severity: "warning", message: "ATR ratio 2.1 — extreme volatility", value: "2.1", threshold: "≤1.5" },
    { name: "Confidence Threshold", passed: true, severity: "critical", message: "0.77", value: "0.77", threshold: "≥0.65" },
    { name: "Open Positions", passed: true, severity: "warning", message: "0 open", value: "0", threshold: "≤2" },
    { name: "Correlation Exposure", passed: true, severity: "warning", message: "No positions", value: "0.0", threshold: "≤0.7" },
    { name: "Consecutive Losses", passed: true, severity: "info", message: "0", value: "0", threshold: "≤2" },
    { name: "Spread/Slippage", passed: false, severity: "warning", message: "Spread $25 — elevated due to panic", value: "0.04%", threshold: "≤0.5%" },
    { name: "Symbol Whitelisted", passed: true, severity: "critical", message: "BTC/USD whitelisted", value: "BTC/USD", threshold: "Whitelist" },
  ],
  reasons: [
    "BLOCKED: No stop-loss defined. Every trade MUST have a stop-loss.",
    "Additional: Extreme volatility in panic regime (ATR 2.1x).",
    "AI recommendation is 'avoid'.",
  ],
  auditSummary:
    "Trade intent demo-005 BLOCKED. Critical: missing stop-loss. Guardian will never approve unprotected trades regardless of signal quality.",
  createdAt: h(7.9),
};

// --- Scenario 6: Trading Paused — 2 Consecutive Losses ---
const s6Intent: TradeIntent = {
  id: uid(6),
  symbol: "ETH/USD",
  side: "long",
  entry: 3450,
  stopLoss: 3380,
  takeProfit: 3580,
  confidence: 0.68,
  thesis: "ETH trending above EMA50. Clean breakout setup.",
  invalidation: "Close below $3,380.",
  proposedSize: 0.4,
  status: "blocked",
  aiAnalysis: {
    market_regime: "trending",
    confidence: 0.68,
    thesis_summary: "Trend continuation with EMA support.",
    invalidation_summary: "Below $3,380 invalidates.",
    recommendation: "favorable",
  },
  signature: "0xmock_eip712_sig_scenario_6",
  createdAt: h(0.5),
};

const s6Decision: GuardianDecision = {
  id: uid(16),
  tradeIntentId: uid(6),
  verdict: "PAUSE_TRADING",
  sizeMultiplier: 0,
  riskScore: 88,
  checks: [
    { name: "Stop-Loss Present", passed: true, severity: "critical", message: "Stop-loss at $3,380", value: "$3,380", threshold: "Required" },
    { name: "Risk Per Trade", passed: true, severity: "critical", message: "Risk 0.72%", value: "0.72%", threshold: "≤1%" },
    { name: "Daily Drawdown", passed: true, severity: "critical", message: "2.1%", value: "2.1%", threshold: "≤3%" },
    { name: "Volatility Check", passed: true, severity: "warning", message: "Normal", value: "1.05", threshold: "≤1.5" },
    { name: "Confidence Threshold", passed: true, severity: "critical", message: "0.68", value: "0.68", threshold: "≥0.65" },
    { name: "Open Positions", passed: true, severity: "warning", message: "0 open", value: "0", threshold: "≤2" },
    { name: "Correlation Exposure", passed: true, severity: "warning", message: "No positions", value: "0.0", threshold: "≤0.7" },
    { name: "Consecutive Losses", passed: false, severity: "critical", message: "2 consecutive losses — COOLDOWN ACTIVATED", value: "2", threshold: "≤2" },
    { name: "Spread/Slippage", passed: true, severity: "warning", message: "Tight spread", value: "0.02%", threshold: "≤0.5%" },
    { name: "Symbol Whitelisted", passed: true, severity: "critical", message: "ETH/USD whitelisted", value: "ETH/USD", threshold: "Whitelist" },
  ],
  reasons: [
    "TRADING PAUSED: 2 consecutive losses triggered automatic cooldown.",
    "Agent must wait for cooldown period before resuming trading.",
    "This protects against tilt and revenge trading behavior.",
  ],
  auditSummary:
    "Trade intent demo-006: PAUSED. Consecutive loss cooldown activated after 2 losing trades. Guardian enforces emotional discipline via automatic trading halt.",
  createdAt: h(0.4),
};

// ─── Build Scenarios ────────────────────────────────────────
export const SCENARIOS: DemoScenario[] = [
  {
    id: uid(1),
    title: "BTC Long — Fully Approved",
    description: "Clean breakout signal passes all guardian checks at full size.",
    tradeIntent: s1Intent,
    guardianDecision: s1Decision,
    marketSnapshot: SNAPSHOTS[0],
    execution: {
      id: uid(21),
      tradeIntentId: uid(1),
      broker: "kraken",
      mode: "mock",
      orderId: "MOCK-ORD-001",
      status: "filled",
      filledPrice: 67460,
      filledSize: 0.015,
      slippageEstimate: 0.0001,
      createdAt: h(1.8),
    },
    position: {
      id: uid(31),
      symbol: "BTC/USD",
      side: "long",
      entryPrice: 67460,
      size: 0.015,
      stopLoss: 66200,
      takeProfit: 69900,
      status: "open",
      openedAt: h(1.8),
      pnl: 145,
    },
    artifacts: makeArtifacts(uid(1), [
      ["signal_detected", "Breakout signal detected for BTC/USD above $68,200 resistance"],
      ["trade_intent_created", "Trade intent created: BTC/USD long at $67,450"],
      ["ai_memo_generated", "AI analysis: trending regime, 82% confidence, favorable"],
      ["guardian_checks_completed", "Guardian: 10/10 checks passed, risk score 22"],
      ["trade_approved", "Trade APPROVED at 100% size"],
      ["trade_executed", "Order filled at $67,460 via Kraken mock"],
    ], 200),
  },
  {
    id: uid(2),
    title: "ETH Long — Approved at 50% (Volatility)",
    description: "Valid signal but elevated ATR triggers adaptive size reduction.",
    tradeIntent: s2Intent,
    guardianDecision: s2Decision,
    marketSnapshot: SNAPSHOTS[1],
    execution: {
      id: uid(22),
      tradeIntentId: uid(2),
      broker: "kraken",
      mode: "mock",
      orderId: "MOCK-ORD-002",
      status: "filled",
      filledPrice: 3522,
      filledSize: 0.25,
      slippageEstimate: 0.0005,
      createdAt: h(1.3),
    },
    position: {
      id: uid(32),
      symbol: "ETH/USD",
      side: "long",
      entryPrice: 3522,
      size: 0.25,
      stopLoss: 3400,
      takeProfit: 3750,
      status: "closed",
      openedAt: h(1.3),
      closedAt: h(0.3),
      pnl: 420,
    },
    artifacts: makeArtifacts(uid(2), [
      ["signal_detected", "Breakout signal for ETH/USD near $3,600 resistance"],
      ["trade_intent_created", "Trade intent: ETH/USD long at $3,520"],
      ["ai_memo_generated", "AI: volatile regime, 71% confidence, cautious"],
      ["guardian_checks_completed", "Guardian: 9/10 passed, volatility flag triggered"],
      ["trade_approved", "APPROVED at 50% size due to elevated ATR"],
      ["trade_executed", "Filled at $3,522, reduced size 0.25"],
      ["trade_closed", "Closed at $3,690 for +$420 profit"],
    ], 210),
  },
  {
    id: uid(3),
    title: "BTC Long — BLOCKED (Daily Drawdown)",
    description: "Good signal rejected because daily loss limit was already breached.",
    tradeIntent: s3Intent,
    guardianDecision: s3Decision,
    marketSnapshot: SNAPSHOTS[2],
    artifacts: makeArtifacts(uid(3), [
      ["signal_detected", "EMA50 bounce signal for BTC/USD"],
      ["trade_intent_created", "Trade intent: BTC/USD long at $66,200"],
      ["ai_memo_generated", "AI: ranging regime, 75% confidence, cautious"],
      ["guardian_checks_completed", "Guardian: FAILED daily drawdown check (3.2% > 3%)"],
      ["trade_blocked", "Trade BLOCKED — capital protection activated"],
    ], 220),
  },
  {
    id: uid(4),
    title: "ETH Long — BLOCKED (Correlation)",
    description: "ETH long blocked due to high correlation with existing BTC position.",
    tradeIntent: s4Intent,
    guardianDecision: s4Decision,
    marketSnapshot: SNAPSHOTS[3],
    artifacts: makeArtifacts(uid(4), [
      ["signal_detected", "Support bounce signal for ETH/USD"],
      ["trade_intent_created", "Trade intent: ETH/USD long at $3,380"],
      ["ai_memo_generated", "AI: volatile, 69% confidence, cautious"],
      ["guardian_checks_completed", "Guardian: correlation 0.85 with BTC exceeds 0.7"],
      ["trade_blocked", "BLOCKED — portfolio concentration risk"],
    ], 230),
  },
  {
    id: uid(5),
    title: "BTC Long — BLOCKED (No Stop-Loss)",
    description: "Trade rejected for missing mandatory stop-loss in panic conditions.",
    tradeIntent: s5Intent,
    guardianDecision: s5Decision,
    marketSnapshot: SNAPSHOTS[4],
    artifacts: makeArtifacts(uid(5), [
      ["signal_detected", "Panic exhaustion reversal signal for BTC/USD"],
      ["trade_intent_created", "Trade intent: BTC/USD long at $65,800 — NO STOP LOSS"],
      ["ai_memo_generated", "AI: panic regime, recommendation AVOID"],
      ["guardian_checks_completed", "Guardian: CRITICAL — no stop-loss, extreme volatility"],
      ["trade_blocked", "BLOCKED — unprotected trade rejected"],
    ], 240),
  },
  {
    id: uid(6),
    title: "ETH Long — PAUSED (Consecutive Losses)",
    description: "Valid setup but trading halted after 2 consecutive losing trades.",
    tradeIntent: s6Intent,
    guardianDecision: s6Decision,
    marketSnapshot: SNAPSHOTS[5],
    artifacts: makeArtifacts(uid(6), [
      ["signal_detected", "Trend continuation signal for ETH/USD"],
      ["trade_intent_created", "Trade intent: ETH/USD long at $3,450"],
      ["ai_memo_generated", "AI: trending, 68% confidence, favorable"],
      ["guardian_checks_completed", "Guardian: consecutive loss cooldown ACTIVE"],
      ["trade_blocked", "PAUSED — automatic cooldown after 2 losses"],
    ], 250),
  },
];

// ─── Daily Metrics History (30 days) ────────────────────────
export const DAILY_METRICS: DailyMetrics[] = Array.from({ length: 30 }, (_, i) => {
  const day = 29 - i;
  const base = 95000 + i * 180 + Math.sin(i * 0.7) * 800;
  return {
    id: uid(300 + i),
    date: new Date(Date.now() - day * 86400000).toISOString().split("T")[0],
    equity: Math.round(base),
    pnl: Math.round((-200 + i * 60 + Math.sin(i) * 300)),
    drawdown: Math.max(0, 0.035 - i * 0.001 + Math.sin(i * 0.5) * 0.008),
    blockedTrades: Math.floor(Math.random() * 3),
    approvedTrades: Math.floor(1 + Math.random() * 3),
    winRate: 0.5 + Math.random() * 0.3,
    sharpeLike: 0.8 + Math.random() * 1.2,
  };
});

// ─── Equity Curve ───────────────────────────────────────────
export const EQUITY_CURVE = DAILY_METRICS.map((m) => ({
  date: m.date,
  equity: m.equity,
  drawdown: m.drawdown * 100,
}));

// ─── Social Posts ───────────────────────────────────────────
export const SOCIAL_POSTS = [
  {
    id: "sp-1",
    text: "🛡️ Guardian Trader blocked a risky ETH trade due to volatility spike. ATR ratio 1.72 triggered automatic size reduction. Risk-first trading. #GuardianTrader #AI #Trading",
    category: "safety",
  },
  {
    id: "sp-2",
    text: "📊 Today's trust score: 85/100. 3 trades approved, 2 blocked by the Guardian risk layer. Every blocked trade is capital saved. #BuildInPublic #DeFi",
    category: "metrics",
  },
  {
    id: "sp-3",
    text: "🔐 New feature: ERC-8004 validation artifacts for every trade. Full audit trail from signal → intent → guardian → execution. Trustless, verifiable, transparent. #ERC8004",
    category: "feature",
  },
  {
    id: "sp-4",
    text: "⚡ Guardian Trader paused all trading after 2 consecutive losses. Built-in emotional discipline > human willpower. Cooldown active. #RiskManagement",
    category: "safety",
  },
  {
    id: "sp-5",
    text: "🏗️ Building an autonomous trading agent where EVERY trade must pass through a 10-point risk checklist before execution. No exceptions. Even for AI. #lablab #hackathon",
    category: "build",
  },
  {
    id: "sp-6",
    text: "📈 Week recap: +$1,240 PnL | 67% win rate | 0.8% max drawdown | 4 trades blocked. The Guardian kept us safe. Sharpe-like: 1.85 #QuantTrading",
    category: "metrics",
  },
  {
    id: "sp-7",
    text: "🤖 Integrated Kraken CLI for market data + execution. Mock → Paper → Live. Adaptive position sizing through the Guardian risk engine. #KrakenCLI",
    category: "feature",
  },
  {
    id: "sp-8",
    text: "🛡️ Why we never let AI directly execute trades: The Guardian risk layer sits between AI signals and capital. Deterministic rules > probabilistic models for risk. #AITrading",
    category: "philosophy",
  },
];

// ─── All Trade Intents (for feed) ───────────────────────────
export const ALL_INTENTS = SCENARIOS.map((s) => s.tradeIntent);
export const ALL_DECISIONS = SCENARIOS.map((s) => s.guardianDecision);
export const ALL_ARTIFACTS = SCENARIOS.flatMap((s) => s.artifacts);
