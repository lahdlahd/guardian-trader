import type { MarketSnapshot, TradeIntent } from "@/lib/types";
import { v4 as uuid } from "uuid";

export function detectBreakoutSignal(
  snapshot: MarketSnapshot,
  _candles?: { close: number; volume: number }[]
): TradeIntent | null {
  const { price, ema50, resistance, support, volumeRatio, regime } = snapshot;

  // Long: price breaks resistance, volume > avg, above EMA50
  if (price > resistance * 0.998 && volumeRatio > 1.2 && price > ema50) {
    const stopLoss = Math.min(support, ema50 * 0.995);
    const riskReward = 2.5;
    const takeProfit = price + (price - stopLoss) * riskReward;
    const confidence = Math.min(0.95, 0.6 + volumeRatio * 0.1 + (regime === "trending" ? 0.1 : 0));

    return {
      id: uuid(),
      symbol: snapshot.symbol,
      side: "long",
      entry: price,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      thesis: `${snapshot.symbol} breaking resistance at $${resistance.toLocaleString()} with ${volumeRatio.toFixed(1)}x volume. EMA50 support at $${ema50.toLocaleString()}.`,
      invalidation: `Close below $${stopLoss.toLocaleString()} invalidates breakout.`,
      proposedSize: 0,
      status: "draft",
      createdAt: new Date(),
    };
  }

  return null;
}
