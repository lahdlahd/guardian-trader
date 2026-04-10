/**
 * Kraken CLI Adapter — Real + Mock
 *
 * Real adapter calls Kraken CLI binary via child_process.
 * Mock adapter returns simulated data for demo/paper trading.
 *
 * Set KRAKEN_CLI_PATH env var to point to the kraken-cli binary.
 * Set TRADING_MODE=live to use real adapter (default: mock).
 */

export interface KrakenAdapter {
  mode: "mock" | "kraken" | "live";
  getMarketData(symbol: string): Promise<MarketTick>;
  getOHLC(symbol: string, timeframe: string): Promise<OHLC[]>;
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
  cancelOrder(orderId: string): Promise<{ success: boolean }>;
  getBalances(): Promise<Record<string, number>>;
  getOpenPositions(): Promise<KrakenPosition[]>;
}

export interface MarketTick { symbol: string; bid: number; ask: number; last: number; volume24h: number; timestamp: number; }
export interface OHLC { time: number; open: number; high: number; low: number; close: number; volume: number; }
export interface OrderRequest { symbol: string; side: "buy" | "sell"; type: "market" | "limit"; size: number; price?: number; stopLoss?: number; takeProfit?: number; }
export interface OrderResponse { orderId: string; status: "pending" | "filled" | "failed"; filledPrice?: number; filledSize?: number; timestamp: number; }
export interface KrakenPosition { symbol: string; side: "buy" | "sell"; size: number; entryPrice: number; unrealizedPnl: number; }

// ─── Real Kraken CLI Adapter ────────────────────────────────
// Calls the actual `kraken` binary (https://github.com/krakenfx/kraken-cli)
// Install: curl --proto '=https' --tlsv1.2 -LsSf https://github.com/krakenfx/kraken-cli/releases/latest/download/kraken-cli-installer.sh | sh
// Auth: export KRAKEN_API_KEY="..." KRAKEN_API_SECRET="..."

export class KrakenCliAdapter implements KrakenAdapter {
  mode = "kraken" as const;
  private cli: string;

  constructor(cliPath?: string) {
    this.cli = cliPath || process.env.KRAKEN_CLI_PATH || "kraken";
  }

  private async exec(args: string[]): Promise<string> {
    const { execSync } = await import("child_process");
    try {
      // kraken <command> [args] -o json 2>/dev/null
      const cmd = `${this.cli} ${args.join(" ")} -o json 2>/dev/null`;
      return execSync(cmd, { timeout: 15000, encoding: "utf-8" });
    } catch (err: unknown) {
      // Parse Kraken CLI JSON error envelope
      if (err && typeof err === "object" && "stdout" in err) {
        const stdout = (err as { stdout: string }).stdout;
        try {
          const envelope = JSON.parse(stdout);
          if (envelope.error) throw new Error(`Kraken CLI [${envelope.error}]: ${envelope.message}`);
        } catch { /* fall through */ }
      }
      throw new Error(`Kraken CLI error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getMarketData(symbol: string): Promise<MarketTick> {
    const pair = symbol.replace("/", "");
    const raw = await this.exec(["ticker", pair]);
    const data = JSON.parse(raw);
    const key = Object.keys(data)[0];
    const t = data[key];
    return {
      symbol,
      bid: parseFloat(t.b[0]),
      ask: parseFloat(t.a[0]),
      last: parseFloat(t.c[0]),
      volume24h: parseFloat(t.v[1]),
      timestamp: Date.now(),
    };
  }

  async getOHLC(symbol: string, timeframe: string): Promise<OHLC[]> {
    const pair = symbol.replace("/", "");
    const interval = timeframe === "4h" ? "240" : timeframe === "1d" ? "1440" : "60";
    const raw = await this.exec(["ohlc", pair, "--interval", interval]);
    const data = JSON.parse(raw);
    const key = Object.keys(data).find(k => k !== "last") || Object.keys(data)[0];
    return (data[key] || []).map((c: (number | string)[]) => ({
      time: Number(c[0]) * 1000,
      open: parseFloat(String(c[1])),
      high: parseFloat(String(c[2])),
      low: parseFloat(String(c[3])),
      close: parseFloat(String(c[4])),
      volume: parseFloat(String(c[6])),
    }));
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const pair = order.symbol.replace("/", "");
    // kraken order buy BTCUSD 0.001 --type limit --price 50000
    const args = ["order", order.side, pair, String(order.size)];
    if (order.type === "limit" && order.price) {
      args.push("--type", "limit", "--price", String(order.price));
    }
    const raw = await this.exec(args);
    const data = JSON.parse(raw);
    return {
      orderId: data.txid?.[0] || `KRK-${Date.now()}`,
      status: data.txid ? "filled" : "pending",
      filledPrice: order.price,
      filledSize: order.size,
      timestamp: Date.now(),
    };
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    const raw = await this.exec(["order", "cancel", orderId]);
    const data = JSON.parse(raw);
    return { success: data.count > 0 || !data.error };
  }

  async getBalances(): Promise<Record<string, number>> {
    const raw = await this.exec(["balance"]);
    const data = JSON.parse(raw);
    const balances: Record<string, number> = {};
    for (const [key, val] of Object.entries(data)) {
      balances[key] = parseFloat(val as string);
    }
    return balances;
  }

  async getOpenPositions(): Promise<KrakenPosition[]> {
    try {
      const raw = await this.exec(["positions"]);
      const data = JSON.parse(raw);
      return Object.values(data).map((p: unknown) => {
        const pos = p as Record<string, string>;
        return {
          symbol: pos.pair || "",
          side: pos.type === "buy" ? "buy" as const : "sell" as const,
          size: parseFloat(pos.vol || "0"),
          entryPrice: parseFloat(pos.cost || "0") / parseFloat(pos.vol || "1"),
          unrealizedPnl: parseFloat(pos.net || "0"),
        };
      });
    } catch { return []; }
  }
}

// ─── Kraken CLI Paper Trading Adapter ───────────────────────
// Uses `kraken paper` commands — no API keys needed, real prices

export class KrakenPaperAdapter implements KrakenAdapter {
  mode = "kraken" as const; // reports as kraken but uses paper commands
  private cli: string;
  private initialized = false;

  constructor(cliPath?: string) {
    this.cli = cliPath || process.env.KRAKEN_CLI_PATH || "kraken";
  }

  private async exec(args: string[]): Promise<string> {
    const { execSync } = await import("child_process");
    const cmd = `${this.cli} ${args.join(" ")} -o json 2>/dev/null`;
    return execSync(cmd, { timeout: 15000, encoding: "utf-8" });
  }

  private async ensureInit() {
    if (this.initialized) return;
    try { await this.exec(["paper", "init", "--balance", "100000"]); } catch { /* already init */ }
    this.initialized = true;
  }

  async getMarketData(symbol: string): Promise<MarketTick> {
    const pair = symbol.replace("/", "");
    const raw = await this.exec(["ticker", pair]);
    const data = JSON.parse(raw);
    const key = Object.keys(data)[0];
    const t = data[key];
    return {
      symbol,
      bid: parseFloat(t.b[0]),
      ask: parseFloat(t.a[0]),
      last: parseFloat(t.c[0]),
      volume24h: parseFloat(t.v[1]),
      timestamp: Date.now(),
    };
  }

  async getOHLC(symbol: string, timeframe: string): Promise<OHLC[]> {
    const pair = symbol.replace("/", "");
    const interval = timeframe === "4h" ? "240" : "60";
    const raw = await this.exec(["ohlc", pair, "--interval", interval]);
    const data = JSON.parse(raw);
    const key = Object.keys(data).find(k => k !== "last") || Object.keys(data)[0];
    return (data[key] || []).map((c: (number | string)[]) => ({
      time: Number(c[0]) * 1000,
      open: parseFloat(String(c[1])),
      high: parseFloat(String(c[2])),
      low: parseFloat(String(c[3])),
      close: parseFloat(String(c[4])),
      volume: parseFloat(String(c[6])),
    }));
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    await this.ensureInit();
    const pair = order.symbol.replace("/", "");
    // kraken paper buy BTCUSD 0.001
    const args = ["paper", order.side, pair, String(order.size)];
    if (order.type === "limit" && order.price) {
      args.push("--type", "limit", "--price", String(order.price));
    }
    const raw = await this.exec(args);
    const data = JSON.parse(raw);
    return {
      orderId: data.order_id || data.id || `PAPER-${Date.now().toString(36)}`,
      status: "filled",
      filledPrice: data.fill_price || data.price,
      filledSize: order.size,
      timestamp: Date.now(),
    };
  }

  async cancelOrder(orderId: string) {
    try { await this.exec(["paper", "cancel", orderId]); } catch { /* ok */ }
    return { success: true };
  }

  async getBalances() {
    await this.ensureInit();
    const raw = await this.exec(["paper", "balance"]);
    return JSON.parse(raw);
  }

  async getOpenPositions(): Promise<KrakenPosition[]> {
    await this.ensureInit();
    try {
      const raw = await this.exec(["paper", "status"]);
      const data = JSON.parse(raw);
      return (data.positions || []).map((p: Record<string, unknown>) => ({
        symbol: String(p.pair || p.symbol || ""),
        side: "buy" as const,
        size: Number(p.size || p.vol || 0),
        entryPrice: Number(p.entry_price || p.avg_price || 0),
        unrealizedPnl: Number(p.unrealized_pnl || p.pnl || 0),
      }));
    } catch { return []; }
  }
}

// ─── Mock Adapter (Demo/Paper Trading) ──────────────────────

export class MockKrakenAdapter implements KrakenAdapter {
  mode = "mock" as const;
  private prices: Record<string, number> = { "BTC/USD": 67450, "ETH/USD": 3520 };
  private balances: Record<string, number> = { USD: 94200, BTC: 0.015, ETH: 0.25 };
  private openPositions: KrakenPosition[] = [
    { symbol: "BTC/USD", side: "buy", size: 0.015, entryPrice: 67460, unrealizedPnl: 145 },
  ];

  // Simulate small price drift each call
  private drift(base: number): number {
    return base * (1 + (Math.random() - 0.5) * 0.002);
  }

  async getMarketData(symbol: string): Promise<MarketTick> {
    const base = this.prices[symbol] || 50000;
    const price = this.drift(base);
    this.prices[symbol] = price;
    const spread = symbol.includes("BTC") ? 12 : 1.2;
    return { symbol, bid: price - spread / 2, ask: price + spread / 2, last: price, volume24h: symbol.includes("BTC") ? 24500 : 185000, timestamp: Date.now() };
  }

  async getOHLC(symbol: string, _tf: string): Promise<OHLC[]> {
    const base = this.prices[symbol] || 50000;
    return Array.from({ length: 50 }, (_, i) => {
      const c = base + Math.sin(i * 0.3) * base * 0.02;
      return { time: Date.now() - (50 - i) * 3600000, open: c - base * 0.002, high: c + base * 0.005, low: c - base * 0.005, close: c + base * 0.001, volume: 100 + Math.random() * 200 };
    });
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const base = this.prices[order.symbol] || 50000;
    const slippage = base * 0.0002 * (Math.random() > 0.5 ? 1 : -1);
    const filled = base + slippage;
    return { orderId: `MOCK-${Date.now().toString(36).toUpperCase()}`, status: "filled", filledPrice: Math.round(filled * 100) / 100, filledSize: order.size, timestamp: Date.now() };
  }

  async cancelOrder(_id: string) { return { success: true }; }
  async getBalances() { return { ...this.balances }; }
  async getOpenPositions() { return [...this.openPositions]; }
}

// ─── Live Kraken REST API Adapter (Real Market Data) ────────
// Uses Kraken's FREE public REST API — no API key needed.
// Orders execute as paper trades with real market prices.

const KRAKEN_API = "https://api.kraken.com/0/public";
const PAIR_MAP: Record<string, string> = { "BTC/USD": "XXBTZUSD", "ETH/USD": "XETHZUSD" };

export class LiveKrakenAPIAdapter implements KrakenAdapter {
  mode = "live" as const;
  private paperBalances: Record<string, number> = { USD: 100000, BTC: 0, ETH: 0 };
  private paperPositions: KrakenPosition[] = [];

  private pair(symbol: string): string {
    return PAIR_MAP[symbol] || symbol.replace("/", "");
  }

  async getMarketData(symbol: string): Promise<MarketTick> {
    const pair = this.pair(symbol);
    const res = await fetch(`${KRAKEN_API}/Ticker?pair=${pair}`, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Kraken API ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.error?.length) throw new Error(`Kraken: ${data.error[0]}`);
    const key = Object.keys(data.result)[0];
    const t = data.result[key];
    return {
      symbol,
      bid: parseFloat(t.b[0]),
      ask: parseFloat(t.a[0]),
      last: parseFloat(t.c[0]),
      volume24h: parseFloat(t.v[1]),
      timestamp: Date.now(),
    };
  }

  async getOHLC(symbol: string, timeframe: string): Promise<OHLC[]> {
    const pair = this.pair(symbol);
    const interval = timeframe === "4h" ? "240" : timeframe === "1d" ? "1440" : "60";
    const res = await fetch(`${KRAKEN_API}/OHLC?pair=${pair}&interval=${interval}`, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Kraken OHLC ${res.status}`);
    const data = await res.json();
    if (data.error?.length) throw new Error(`Kraken: ${data.error[0]}`);
    const key = Object.keys(data.result).find(k => k !== "last") || Object.keys(data.result)[0];
    const candles = data.result[key] || [];
    return candles.map((c: (number | string)[]) => ({
      time: (Number(c[0])) * 1000,
      open: parseFloat(String(c[1])),
      high: parseFloat(String(c[2])),
      low: parseFloat(String(c[3])),
      close: parseFloat(String(c[4])),
      volume: parseFloat(String(c[6])),
    }));
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    // Paper trade: execute at real market price
    const tick = await this.getMarketData(order.symbol);
    const fillPrice = order.side === "buy" ? tick.ask : tick.bid;
    const asset = order.symbol.split("/")[0];

    if (order.side === "buy") {
      this.paperBalances.USD -= fillPrice * order.size;
      this.paperBalances[asset] = (this.paperBalances[asset] || 0) + order.size;
      this.paperPositions.push({
        symbol: order.symbol,
        side: "buy",
        size: order.size,
        entryPrice: fillPrice,
        unrealizedPnl: 0,
      });
    }

    return {
      orderId: `PAPER-${Date.now().toString(36).toUpperCase()}`,
      status: "filled",
      filledPrice: Math.round(fillPrice * 100) / 100,
      filledSize: order.size,
      timestamp: Date.now(),
    };
  }

  async cancelOrder(_id: string) { return { success: true }; }

  async getBalances() {
    // Update with real prices
    try {
      const btcTick = await this.getMarketData("BTC/USD");
      const ethTick = await this.getMarketData("ETH/USD");
      return {
        ...this.paperBalances,
        USD_value: this.paperBalances.USD
          + (this.paperBalances.BTC || 0) * btcTick.last
          + (this.paperBalances.ETH || 0) * ethTick.last,
      };
    } catch {
      return { ...this.paperBalances };
    }
  }

  async getOpenPositions(): Promise<KrakenPosition[]> {
    // Update unrealized PnL with real prices
    for (const pos of this.paperPositions) {
      try {
        const tick = await this.getMarketData(pos.symbol);
        pos.unrealizedPnl = (tick.last - pos.entryPrice) * pos.size * (pos.side === "buy" ? 1 : -1);
      } catch { /* keep last pnl */ }
    }
    return [...this.paperPositions];
  }
}

// ─── Factory ────────────────────────────────────────────────

export function createKrakenAdapter(mode?: "mock" | "kraken" | "paper" | "live"): KrakenAdapter {
  const m = mode || process.env.TRADING_MODE || "live";
  if (m === "kraken") return new KrakenCliAdapter();
  if (m === "paper") return new KrakenPaperAdapter();
  if (m === "live") return new LiveKrakenAPIAdapter();
  return new MockKrakenAdapter();
}
