import { NextRequest, NextResponse } from "next/server";
import { createKrakenAdapter } from "@/lib/execution/kraken-adapter";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") || "BTC/USD";
  const kraken = createKrakenAdapter();
  try {
    const [tick, candles] = await Promise.all([
      kraken.getMarketData(symbol),
      kraken.getOHLC(symbol, "1h"),
    ]);
    return NextResponse.json({ tick, candles: candles.slice(-50), adapter: kraken.mode });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
