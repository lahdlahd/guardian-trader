import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────
export const MarketRegime = z.enum(["trending", "ranging", "volatile", "panic"]);
export type MarketRegime = z.infer<typeof MarketRegime>;

export const TradeSide = z.enum(["long", "short"]);
export type TradeSide = z.infer<typeof TradeSide>;

export const GuardianVerdict = z.enum([
  "APPROVE",
  "APPROVE_WITH_REDUCED_SIZE",
  "BLOCK",
  "PAUSE_TRADING",
]);
export type GuardianVerdict = z.infer<typeof GuardianVerdict>;

export const TradeStatus = z.enum([
  "draft",
  "pending_review",
  "approved",
  "blocked",
  "executing",
  "filled",
  "closed",
  "cancelled",
]);
export type TradeStatus = z.infer<typeof TradeStatus>;

export const PositionStatus = z.enum(["open", "closed", "liquidated"]);
export type PositionStatus = z.infer<typeof PositionStatus>;

export const ArtifactType = z.enum([
  "signal_detected",
  "trade_intent_created",
  "ai_memo_generated",
  "guardian_checks_completed",
  "trade_approved",
  "trade_blocked",
  "trade_executed",
  "trade_closed",
  "post_trade_review",
]);
export type ArtifactType = z.infer<typeof ArtifactType>;

export const AIRecommendation = z.enum(["favorable", "cautious", "avoid"]);
export type AIRecommendation = z.infer<typeof AIRecommendation>;

// ─── Agent Identity ─────────────────────────────────────────
export const AgentIdentitySchema = z.object({
  id: z.string(),
  name: z.string(),
  walletAddress: z.string(),
  capabilities: z.array(z.string()),
  status: z.enum(["active", "suspended", "retired"]),
  registryTxHash: z.string().optional(),
  createdAt: z.date(),
});
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;

// ─── Market Snapshot ────────────────────────────────────────
export const MarketSnapshotSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  price: z.number(),
  ema50: z.number(),
  atr: z.number(),
  volumeRatio: z.number(),
  support: z.number(),
  resistance: z.number(),
  regime: MarketRegime,
  spread: z.number(),
  timestamp: z.date(),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

// ─── AI Analysis ────────────────────────────────────────────
export const AIAnalysisSchema = z.object({
  market_regime: MarketRegime,
  confidence: z.number().min(0).max(1),
  thesis_summary: z.string(),
  invalidation_summary: z.string(),
  recommendation: AIRecommendation,
});
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// ─── Trade Intent ───────────────────────────────────────────
export const TradeIntentSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: TradeSide,
  entry: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  confidence: z.number().min(0).max(1),
  thesis: z.string(),
  invalidation: z.string(),
  proposedSize: z.number(),
  status: TradeStatus,
  aiAnalysis: AIAnalysisSchema.optional(),
  signature: z.string().optional(),
  createdAt: z.date(),
});
export type TradeIntent = z.infer<typeof TradeIntentSchema>;

// ─── Guardian Check ─────────────────────────────────────────
export const GuardianCheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  value: z.string().optional(),
  threshold: z.string().optional(),
});
export type GuardianCheck = z.infer<typeof GuardianCheckSchema>;

export const GuardianDecisionSchema = z.object({
  id: z.string(),
  tradeIntentId: z.string(),
  verdict: GuardianVerdict,
  sizeMultiplier: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(100),
  checks: z.array(GuardianCheckSchema),
  reasons: z.array(z.string()),
  auditSummary: z.string(),
  createdAt: z.date(),
});
export type GuardianDecision = z.infer<typeof GuardianDecisionSchema>;

// ─── Order Execution ────────────────────────────────────────
export const OrderExecutionSchema = z.object({
  id: z.string(),
  tradeIntentId: z.string(),
  broker: z.string(),
  mode: z.enum(["mock", "kraken", "live"]),
  orderId: z.string(),
  status: z.enum(["pending", "filled", "failed", "cancelled"]),
  filledPrice: z.number().optional(),
  filledSize: z.number().optional(),
  slippageEstimate: z.number().optional(),
  createdAt: z.date(),
});
export type OrderExecution = z.infer<typeof OrderExecutionSchema>;

// ─── Position ───────────────────────────────────────────────
export const PositionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: TradeSide,
  entryPrice: z.number(),
  size: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  status: PositionStatus,
  openedAt: z.date(),
  closedAt: z.date().optional(),
  pnl: z.number().optional(),
});
export type Position = z.infer<typeof PositionSchema>;

// ─── Validation Artifact ────────────────────────────────────
export const ValidationArtifactSchema = z.object({
  id: z.string(),
  type: ArtifactType,
  entityId: z.string(),
  entityType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  hash: z.string(),
  score: z.number().optional(),
  registryStatus: z.enum(["pending", "submitted", "verified"]),
  actorId: z.string(),
  summary: z.string(),
  createdAt: z.date(),
});
export type ValidationArtifact = z.infer<typeof ValidationArtifactSchema>;

// ─── Reputation Score ───────────────────────────────────────
export const ReputationScoreSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  pnlScore: z.number(),
  drawdownScore: z.number(),
  validationScore: z.number(),
  trustScore: z.number(),
  updatedAt: z.date(),
});
export type ReputationScore = z.infer<typeof ReputationScoreSchema>;

// ─── Daily Metrics ──────────────────────────────────────────
export const DailyMetricsSchema = z.object({
  id: z.string(),
  date: z.string(),
  equity: z.number(),
  pnl: z.number(),
  drawdown: z.number(),
  blockedTrades: z.number(),
  approvedTrades: z.number(),
  winRate: z.number(),
  sharpeLike: z.number(),
});
export type DailyMetrics = z.infer<typeof DailyMetricsSchema>;

// ─── Account State ──────────────────────────────────────────
export const AccountStateSchema = z.object({
  equity: z.number(),
  availableBalance: z.number(),
  dailyPnl: z.number(),
  dailyDrawdown: z.number(),
  openPositionsCount: z.number(),
  consecutiveLosses: z.number(),
});
export type AccountState = z.infer<typeof AccountStateSchema>;

// ─── Risk Policy ────────────────────────────────────────────
export const RiskPolicySchema = z.object({
  maxRiskPerTrade: z.number().default(0.01),
  maxDailyDrawdown: z.number().default(0.03),
  maxOpenPositions: z.number().default(2),
  minConfidence: z.number().default(0.65),
  volatilityReduceThreshold: z.number().default(1.5),
  volatilitySizeMultiplier: z.number().default(0.5),
  consecutiveLossCooldown: z.number().default(2),
  whitelistedSymbols: z.array(z.string()).default(["BTC/USD", "ETH/USD"]),
  maxSpreadPct: z.number().default(0.005),
  maxCorrelationExposure: z.number().default(0.7),
  maxLeverage: z.number().default(1),
});
export type RiskPolicy = z.infer<typeof RiskPolicySchema>;

// ─── Demo Scenario ──────────────────────────────────────────
export const DemoScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tradeIntent: TradeIntentSchema,
  guardianDecision: GuardianDecisionSchema,
  marketSnapshot: MarketSnapshotSchema,
  execution: OrderExecutionSchema.optional(),
  position: PositionSchema.optional(),
  artifacts: z.array(ValidationArtifactSchema),
});
export type DemoScenario = z.infer<typeof DemoScenarioSchema>;

// ─── EIP-712 Typed Data (Mock) ──────────────────────────────
export const EIP712TradeIntentSchema = z.object({
  types: z.object({
    TradeIntent: z.array(
      z.object({ name: z.string(), type: z.string() })
    ),
  }),
  primaryType: z.literal("TradeIntent"),
  domain: z.object({
    name: z.string(),
    version: z.string(),
    chainId: z.number(),
    verifyingContract: z.string(),
  }),
  message: z.record(z.string(), z.unknown()),
});
export type EIP712TradeIntent = z.infer<typeof EIP712TradeIntentSchema>;
