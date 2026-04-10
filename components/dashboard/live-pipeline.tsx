"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play, Loader2, CheckCircle2, XCircle, AlertTriangle, Pause, Shield,
  Zap, FileText, ChevronDown, ChevronUp,
} from "lucide-react";

interface PipelineResult {
  status: string;
  scenarioName?: string;
  tradeIntent?: { id: string; symbol: string; side: string; entry: number; stopLoss: number; takeProfit: number; confidence: number; thesis: string; signature?: string };
  aiAnalysis?: { market_regime: string; confidence: number; recommendation: string; thesis_summary: string; source: string };
  guardianDecision?: { verdict: string; riskScore: number; sizeMultiplier: number; checks: { name: string; passed: boolean; message: string }[]; reasons: string[]; auditSummary: string };
  execution?: { orderId: string; filledPrice?: number; mode: string; status: string } | null;
  snapshot?: { price: number; ema50: number; atr: number; volumeRatio: number; regime: string };
  artifacts?: { id: string; type: string; summary: string; hash: string; score?: number; registryStatus: string }[];
  eip712?: { signature: string; typedData: unknown };
  registryEvents?: { type: string; txHash: string; blockNumber: number }[];
  adapter?: string;
}

const SCENARIOS = [
  { label: "BTC Long — Full Approval", idx: 0 },
  { label: "ETH Long — Reduced (Volatility)", idx: 1 },
  { label: "BTC — Blocked (Drawdown)", idx: 2 },
  { label: "ETH — Blocked (Correlation)", idx: 3 },
  { label: "BTC — Blocked (No SL)", idx: 4 },
  { label: "ETH — Paused (Losses)", idx: 5 },
];

const verdictStyle: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  APPROVE: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", icon: CheckCircle2 },
  APPROVE_WITH_REDUCED_SIZE: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", icon: AlertTriangle },
  BLOCK: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", icon: XCircle },
  PAUSE_TRADING: { bg: "bg-violet-500/10 border-violet-500/20", text: "text-violet-400", icon: Pause },
};

export function LivePipelineRunner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(0);

  const runScenario = async (idx: number) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/run-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioIndex: idx }),
      });
      const data = await res.json();
      setResult(data);
      setExpanded(true);
    } catch (err) {
      setResult({ status: "error" });
    }
    setLoading(false);
  };

  const runFreeform = async (symbol: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      setResult(data);
      setExpanded(true);
    } catch (err) {
      setResult({ status: "error" });
    }
    setLoading(false);
  };

  const vs = result?.guardianDecision?.verdict ? verdictStyle[result.guardianDecision.verdict] : null;

  return (
    <Card className="border-emerald-500/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-400" />
          Live Pipeline Runner
        </CardTitle>
        <Badge variant="info">Real-time</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Selector */}
        <div className="grid grid-cols-3 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.idx}
              onClick={() => { setSelectedScenario(s.idx); runScenario(s.idx); }}
              disabled={loading}
              className={`rounded-lg px-3 py-2 text-xs text-left transition-colors ${
                selectedScenario === s.idx ? "bg-white/[0.08] text-white" : "bg-white/[0.02] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Freeform */}
        <div className="flex gap-2">
          <button onClick={() => runFreeform("BTC/USD")} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run BTC Pipeline
          </button>
          <button onClick={() => runFreeform("ETH/USD")} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-sky-500/10 border border-sky-500/20 py-2 text-sm text-sky-400 hover:bg-sky-500/20 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run ETH Pipeline
          </button>
        </div>

        {/* Result */}
        {result && result.status !== "error" && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            {/* Verdict Banner */}
            {vs && result.guardianDecision && (
              <div className={`rounded-xl ${vs.bg} border p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <vs.icon className={`h-6 w-6 ${vs.text}`} />
                  <div>
                    <p className={`text-lg font-bold ${vs.text}`}>
                      {result.guardianDecision.verdict.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {result.scenarioName || result.tradeIntent?.symbol} · Risk Score {result.guardianDecision.riskScore}/100
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Adapter: {result.adapter}</p>
                  <p className="text-xs text-zinc-500">AI: {result.aiAnalysis?.source}</p>
                </div>
              </div>
            )}

            {result.status === "no_signal" && (
              <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                <p className="text-sm text-zinc-400">No breakout signal detected</p>
                <p className="text-xs text-zinc-600 mt-1">Market conditions don&apos;t meet entry criteria</p>
              </div>
            )}

            {/* Expandable Details */}
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Collapse" : "Expand"} details
            </button>

            {expanded && (
              <div className="space-y-3">
                {/* Guardian Checks */}
                {result.guardianDecision?.checks && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 uppercase font-medium flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Guardian Checks
                    </p>
                    {result.guardianDecision.checks.map((c, i) => (
                      <div key={i} className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${c.passed ? "bg-white/[0.01]" : "bg-red-500/[0.05]"}`}>
                        <div className="flex items-center gap-2">
                          {c.passed ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                          <span className="text-zinc-400">{c.name}</span>
                        </div>
                        <span className="text-zinc-600">{c.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Artifacts */}
                {result.artifacts && result.artifacts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 uppercase font-medium flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Validation Artifacts ({result.artifacts.length})
                    </p>
                    {result.artifacts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="text-zinc-400">{a.summary}</span>
                        </div>
                        <span className="text-zinc-700 font-mono">{a.hash.slice(0, 14)}...</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* EIP-712 Signature */}
                {result.eip712 && (
                  <div className="rounded-lg bg-white/[0.02] p-3">
                    <p className="text-xs text-zinc-500 uppercase font-medium mb-1">EIP-712 Signature</p>
                    <p className="text-[10px] text-zinc-700 font-mono break-all">{result.eip712.signature}</p>
                  </div>
                )}

                {/* Registry Events */}
                {result.registryEvents && result.registryEvents.length > 0 && (
                  <div className="rounded-lg bg-white/[0.02] p-3">
                    <p className="text-xs text-zinc-500 uppercase font-medium mb-1">Registry Events</p>
                    {result.registryEvents.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] text-zinc-600 py-0.5">
                        <span>{e.type}</span>
                        <span className="font-mono">{e.txHash.slice(0, 18)}... (block #{e.blockNumber})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {result?.status === "error" && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">Pipeline error. Check console.</div>
        )}
      </CardContent>
    </Card>
  );
}
