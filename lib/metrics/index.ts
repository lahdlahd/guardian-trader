import type { Position, DailyMetrics } from "@/lib/types";

export function calculatePnL(positions: Position[]): number {
  return positions.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
}

export function calculateMaxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0] ?? 0;
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = (peak - eq) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function calculateSharpeLike(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(252);
}

export function calculateWinRate(positions: Position[]): number {
  const closed = positions.filter(p => p.status === "closed" && p.pnl != null);
  if (closed.length === 0) return 0;
  return closed.filter(p => (p.pnl ?? 0) > 0).length / closed.length;
}

export function calculateTrustScore(metrics: {
  pnlScore: number;
  drawdownScore: number;
  validationScore: number;
}): number {
  return Math.round(metrics.pnlScore * 0.25 + metrics.drawdownScore * 0.35 + metrics.validationScore * 0.4);
}
