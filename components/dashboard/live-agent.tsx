"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio, Loader2, TrendingUp, TrendingDown, Play, Square, Wifi, WifiOff,
  Download, Bot, Zap, RefreshCw,
} from "lucide-react";

interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume24h: number;
  timestamp: number;
}

interface TickerState {
  status: "live" | "fallback" | "error";
  source: string;
  tickers: { "BTC/USD"?: Ticker; "ETH/USD"?: Ticker };
  error?: string;
}

interface ScanResult {
  status: string;
  adapter: string;
  symbolsScanned: number;
  signalsFound: number;
  timestamp: string;
  results: {
    symbol: string;
    status: string;
    price?: number;
    source?: string;
    guardianDecision?: { verdict: string; riskScore: number };
    error?: string;
  }[];
}

export function LiveTicker() {
  const [data, setData] = useState<TickerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});

  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch("/api/live-ticker");
      const json: TickerState = await res.json();
      // Track previous prices for color flash
      if (data?.tickers) {
        const prev: Record<string, number> = {};
        if (data.tickers["BTC/USD"]) prev["BTC/USD"] = data.tickers["BTC/USD"].last;
        if (data.tickers["ETH/USD"]) prev["ETH/USD"] = data.tickers["ETH/USD"].last;
        setPrevPrices(prev);
      }
      setData(json);
    } catch {
      setData({ status: "error", source: "Failed to fetch", tickers: {}, error: "Network error" });
    }
  }, [data]);

  useEffect(() => {
    fetchTicker();
    const interval = setInterval(fetchTicker, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLive = data?.status === "live";

  return (
    <Card className={`border ${isLive ? "border-emerald-500/20" : "border-amber-500/20"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Live Market Data</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isLive ? "success" : "warning"} className="text-[10px]">
              <span className={`mr-1 h-1.5 w-1.5 rounded-full inline-block ${isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {data?.source || "Loading..."}
            </Badge>
            <button onClick={fetchTicker} className="rounded p-1 hover:bg-white/[0.05] transition-colors">
              <RefreshCw className="h-3 w-3 text-zinc-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["BTC/USD", "ETH/USD"] as const).map(sym => {
            const t = data?.tickers?.[sym];
            const prev = prevPrices[sym];
            const up = t && prev ? t.last > prev : undefined;
            return (
              <div key={sym} className="rounded-xl bg-white/[0.03] p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-500">{sym}</span>
                  {up !== undefined && (
                    up ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                </div>
                {t ? (
                  <>
                    <p className={`text-xl font-bold font-mono tracking-tight ${up === true ? "text-emerald-400" : up === false ? "text-red-400" : "text-white"}`}>
                      ${t.last.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex justify-between mt-1 text-[10px] text-zinc-600 font-mono">
                      <span>Bid: ${t.bid.toLocaleString()}</span>
                      <span>Ask: ${t.ask.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-zinc-700 mt-0.5">
                      Vol 24h: {t.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </>
                ) : (
                  <div className="h-12 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-zinc-700 animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentControlPanel() {
  const [scanning, setScanning] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/agent-scan", { method: "POST" });
      const data: ScanResult = await res.json();
      setScanResults(prev => [data, ...prev].slice(0, 10));
    } catch (err) {
      setScanResults(prev => [{
        status: "error", adapter: "live", symbolsScanned: 0, signalsFound: 0,
        timestamp: new Date().toISOString(), results: [{ symbol: "ALL", status: "error", error: String(err) }],
      }, ...prev]);
    }
    setScanning(false);
  }, []);

  const toggleAutoScan = () => {
    if (autoRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setAutoRunning(false);
    } else {
      setAutoRunning(true);
      runScan(); // immediate first scan
      intervalRef.current = setInterval(runScan, 30000); // every 30s
    }
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const verdictColor: Record<string, string> = {
    APPROVE: "text-emerald-400",
    APPROVE_WITH_REDUCED_SIZE: "text-amber-400",
    BLOCK: "text-red-400",
    PAUSE_TRADING: "text-violet-400",
  };

  return (
    <Card className="border-sky-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Autonomous Agent</span>
          </div>
          <div className="flex items-center gap-2">
            {autoRunning && (
              <Badge variant="success" className="text-[10px]">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Auto-scanning every 30s
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/20 px-4 py-2 text-sm text-sky-400 transition-all disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Scan Now (Real Data)
          </button>
          <button
            onClick={toggleAutoScan}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
              autoRunning
                ? "bg-red-500/15 border-red-500/20 text-red-400 hover:bg-red-500/25"
                : "bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25"
            }`}
          >
            {autoRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {autoRunning ? "Stop Agent" : "Start Agent"}
          </button>
          <a
            href="/api/export-artifacts"
            target="_blank"
            className="flex items-center gap-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2 text-sm text-zinc-400 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export Artifacts
          </a>
        </div>

        {/* Scan Results */}
        {scanResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scanResults.map((scan, i) => (
              <div key={i} className="rounded-lg bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={scan.signalsFound > 0 ? "success" : "default"} className="text-[10px]">
                      {scan.signalsFound > 0 ? `${scan.signalsFound} signal(s)` : "No signals"}
                    </Badge>
                    <Badge variant="info" className="text-[10px]">{scan.adapter}</Badge>
                    <span className="text-[10px] text-zinc-600">{new Date(scan.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {scan.results.map((r, j) => (
                    <div key={j} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 font-mono">{r.symbol}</span>
                        {r.price && <span className="text-zinc-500">${r.price.toLocaleString()}</span>}
                        <span className="text-zinc-600">{r.source}</span>
                      </div>
                      <div>
                        {r.guardianDecision ? (
                          <span className={`font-medium ${verdictColor[r.guardianDecision.verdict] || "text-zinc-400"}`}>
                            {r.guardianDecision.verdict.replace(/_/g, " ")} ({r.guardianDecision.riskScore})
                          </span>
                        ) : r.status === "no_signal" ? (
                          <span className="text-zinc-600">No signal</span>
                        ) : r.error ? (
                          <span className="text-red-400 truncate max-w-[200px]">{r.error}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
