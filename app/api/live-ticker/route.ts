/**
 * GET /api/live-ticker
 * Returns real-time BTC/USD and ETH/USD prices from Kraken's public API.
 * No API key required.
 */

import { NextResponse } from "next/server";
import { createKrakenAdapter } from "@/lib/execution/kraken-adapter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const adapter = createKrakenAdapter("live");
  try {
    const [btc, eth] = await Promise.all([
      adapter.getMarketData("BTC/USD"),
      adapter.getMarketData("ETH/USD"),
    ]);
    return NextResponse.json({
      status: "live",
      source: "Kraken REST API",
      timestamp: Date.now(),
      tickers: { "BTC/USD": btc, "ETH/USD": eth },
    });
  } catch (err) {
    // Fallback to mock if Kraken API is unreachable
    const mock = createKrakenAdapter("mock");
    const [btc, eth] = await Promise.all([
      mock.getMarketData("BTC/USD"),
      mock.getMarketData("ETH/USD"),
    ]);
    return NextResponse.json({
      status: "fallback",
      source: "Mock (Kraken API unreachable)",
      error: err instanceof Error ? err.message : String(err),
      timestamp: Date.now(),
      tickers: { "BTC/USD": btc, "ETH/USD": eth },
    });
  }
}
