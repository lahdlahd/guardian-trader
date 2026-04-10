/**
 * AI Analyst — Real OpenAI + Deterministic Fallback
 * Set OPENAI_API_KEY to enable real AI. Without it, uses rule-based analysis.
 * AI NEVER executes trades — only provides structured analysis.
 */

import { AIAnalysisSchema, type AIAnalysis, type MarketSnapshot, type TradeIntent } from "@/lib/types";

const REGIME_SYSTEM = `You are a quantitative crypto market regime classifier.
Respond with ONLY valid JSON — no markdown, no backticks.
{"market_regime":"trending"|"ranging"|"volatile"|"panic","confidence":<0-1>,"thesis_summary":"<2 sentences>","invalidation_summary":"<1 sentence>","recommendation":"favorable"|"cautious"|"avoid"}
Rules: trending=price>EMA50+volume>1.2x, ranging=near EMA50+low vol, volatile=ATR>1.5x, panic=ATR>2x+price<<EMA50.`;

const MEMO_SYSTEM = `You are a senior crypto trading analyst. Generate a trade memo.
Respond with ONLY valid JSON — no markdown, no backticks.
{"market_regime":"trending"|"ranging"|"volatile"|"panic","confidence":<0-1>,"thesis_summary":"<2-3 sentences>","invalidation_summary":"<1 sentence>","recommendation":"favorable"|"cautious"|"avoid"}`;

const REVIEW_SYSTEM = `You are a trading performance reviewer.
Respond with ONLY valid JSON — no markdown, no backticks.
{"outcome_quality":"excellent"|"good"|"neutral"|"poor","execution_quality":"excellent"|"good"|"neutral"|"poor","risk_management_quality":"excellent"|"good"|"neutral"|"poor","lessons":["<lesson>","<lesson>"],"score":<0-100>}`;

async function callLLM(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.2, max_tokens: 500, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

function safeJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim()); } catch { return null; }
}

function deterministicAnalysis(s: MarketSnapshot): AIAnalysis {
  const aboveEma = s.price > s.ema50;
  const atrR = s.atr / (s.price * 0.01);
  let regime = s.regime, conf = 0.65, rec: AIAnalysis["recommendation"] = "cautious";
  if (atrR > 2) { regime = "panic"; conf = 0.45; rec = "avoid"; }
  else if (atrR > 1.5) { regime = "volatile"; conf = 0.58; rec = "cautious"; }
  else if (aboveEma && s.volumeRatio > 1.2) { regime = "trending"; conf = 0.8; rec = "favorable"; }
  else { regime = "ranging"; conf = 0.6; rec = "cautious"; }
  return {
    market_regime: regime,
    confidence: Math.round(Math.min(0.95, conf) * 100) / 100,
    thesis_summary: `${s.symbol} in ${regime} regime at $${s.price.toLocaleString()}, ${aboveEma ? "above" : "below"} EMA50. Volume ${s.volumeRatio.toFixed(1)}x average, ATR ratio ${atrR.toFixed(2)}.`,
    invalidation_summary: `Invalidated if price ${aboveEma ? "closes below" : "fails to recover above"} EMA50 at $${s.ema50.toLocaleString()}.`,
    recommendation: rec,
  };
}

export async function analyzeTradeOpportunity(snapshot: MarketSnapshot, intent?: Partial<TradeIntent>): Promise<AIAnalysis & { source: "ai" | "deterministic" }> {
  const msg = `${snapshot.symbol}: Price $${snapshot.price}, EMA50 $${snapshot.ema50}, ATR $${snapshot.atr}, VolRatio ${snapshot.volumeRatio}x, Support $${snapshot.support}, Resistance $${snapshot.resistance}, Spread $${snapshot.spread}${intent ? `, Proposed: ${intent.side} @ $${intent.entry} SL $${intent.stopLoss} TP $${intent.takeProfit}` : ""}`;
  const raw = await callLLM(REGIME_SYSTEM, msg);
  const p = safeJSON<AIAnalysis>(raw);
  if (p) { try { return { ...AIAnalysisSchema.parse(p), source: "ai" }; } catch {} }
  return { ...AIAnalysisSchema.parse(deterministicAnalysis(snapshot)), source: "deterministic" };
}

export async function generateTradeMemo(intent: TradeIntent, snapshot: MarketSnapshot): Promise<AIAnalysis & { source: "ai" | "deterministic" }> {
  const msg = `Memo for ${intent.symbol} ${intent.side} @ $${intent.entry}, SL $${intent.stopLoss}, TP $${intent.takeProfit}. Market: $${snapshot.price}, EMA50 $${snapshot.ema50}, ATR $${snapshot.atr}, Vol ${snapshot.volumeRatio}x, ${snapshot.regime}`;
  const raw = await callLLM(MEMO_SYSTEM, msg);
  const p = safeJSON<AIAnalysis>(raw);
  if (p) { try { return { ...AIAnalysisSchema.parse(p), source: "ai" }; } catch {} }
  return { ...deterministicAnalysis(snapshot), source: "deterministic" };
}

export async function generatePostTradeReview(intent: TradeIntent, pnl: number) {
  const msg = `${intent.symbol} ${intent.side} Entry $${intent.entry} SL $${intent.stopLoss} TP $${intent.takeProfit} P&L $${pnl} Confidence ${intent.confidence}`;
  const raw = await callLLM(REVIEW_SYSTEM, msg);
  type Review = { outcome_quality: string; execution_quality: string; risk_management_quality: string; lessons: string[]; score: number };
  const p = safeJSON<Review>(raw);
  if (p?.lessons) return { ...p, source: "ai" as const };
  const w = pnl > 0;
  return { outcome_quality: w ? "good" : "neutral", execution_quality: "good", risk_management_quality: intent.stopLoss > 0 ? "excellent" : "poor", lessons: w ? ["Thesis validated.", "Risk/reward favorable."] : ["Entry timing improvable.", "Consider tighter stops."], score: w ? 78 : 45, source: "deterministic" as const };
}
