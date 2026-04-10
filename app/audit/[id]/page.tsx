"use client";

import { use } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCENARIOS } from "@/lib/demo/data";
import { formatCurrency } from "@/lib/utils";
import {
  Shield, CheckCircle2, XCircle, AlertTriangle, Pause, BarChart3, FileText, Activity, Fingerprint, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const verdictColor: Record<string, string> = {
  APPROVE: "text-emerald-400",
  APPROVE_WITH_REDUCED_SIZE: "text-amber-400",
  BLOCK: "text-red-400",
  PAUSE_TRADING: "text-violet-400",
};
const verdictBadge: Record<string, "success"|"warning"|"danger"|"purple"> = {
  APPROVE: "success",
  APPROVE_WITH_REDUCED_SIZE: "warning",
  BLOCK: "danger",
  PAUSE_TRADING: "purple",
};

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) return <p className="text-zinc-500">Scenario not found.</p>;

  const { tradeIntent: ti, guardianDecision: gd, marketSnapshot: ms, execution: ex, position: pos, artifacts } = scenario;

  return (
    <div className="space-y-6 max-w-[1000px]">
      <Link href="/guardian" className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
        <ArrowLeft className="h-3 w-3" /> Back to Guardian
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Audit Trail — {ti.symbol} {ti.side.toUpperCase()}</h1>
          <p className="text-sm text-zinc-600 mt-0.5">{scenario.title}</p>
        </div>
        <Badge variant={verdictBadge[gd.verdict]}>{gd.verdict.replace(/_/g, " ")}</Badge>
      </div>

      {/* Market Snapshot */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4"/>Market Snapshot</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { l: "Price", v: formatCurrency(ms.price) },
              { l: "EMA50", v: formatCurrency(ms.ema50) },
              { l: "ATR", v: formatCurrency(ms.atr) },
              { l: "Vol Ratio", v: ms.volumeRatio.toFixed(2) + "x" },
              { l: "Regime", v: ms.regime },
              { l: "Support", v: formatCurrency(ms.support) },
              { l: "Resistance", v: formatCurrency(ms.resistance) },
              { l: "Spread", v: formatCurrency(ms.spread) },
            ].map(d => (
              <div key={d.l} className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-600">{d.l}</p>
                <p className="text-sm text-zinc-300 font-mono mt-0.5">{d.v}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trade Intent */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4"/>Trade Intent</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[
              { l: "Entry", v: formatCurrency(ti.entry) },
              { l: "Stop Loss", v: ti.stopLoss ? formatCurrency(ti.stopLoss) : "NONE", c: ti.stopLoss ? "" : "text-red-400" },
              { l: "Take Profit", v: formatCurrency(ti.takeProfit) },
              { l: "Confidence", v: String(ti.confidence) },
            ].map(d => (
              <div key={d.l} className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-600">{d.l}</p>
                <p className={`text-sm font-mono mt-0.5 ${d.c || "text-zinc-300"}`}>{d.v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500 mb-1">Thesis</p>
            <p className="text-sm text-zinc-400">{ti.thesis}</p>
          </div>
          <div className="rounded-lg bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500 mb-1">Invalidation</p>
            <p className="text-sm text-zinc-400">{ti.invalidation}</p>
          </div>
          {ti.signature && (
            <div className="text-xs text-zinc-700 font-mono">EIP-712 Signature: {ti.signature}</div>
          )}
        </CardContent>
      </Card>

      {/* AI Memo */}
      {ti.aiAnalysis && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Fingerprint className="h-4 w-4"/>AI Analyst Memo</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-600">Regime</p>
                <p className="text-sm text-zinc-300 mt-0.5">{ti.aiAnalysis.market_regime}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-600">Confidence</p>
                <p className="text-sm text-zinc-300 mt-0.5">{ti.aiAnalysis.confidence}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-600">Recommendation</p>
                <Badge variant={ti.aiAnalysis.recommendation === "favorable" ? "success" : ti.aiAnalysis.recommendation === "cautious" ? "warning" : "danger"}>
                  {ti.aiAnalysis.recommendation}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg bg-white/[0.02] p-3">
                <p className="text-xs text-zinc-500 mb-1">AI Thesis</p>
                <p className="text-sm text-zinc-400">{ti.aiAnalysis.thesis_summary}</p>
              </div>
              <div className="rounded-lg bg-white/[0.02] p-3">
                <p className="text-xs text-zinc-500 mb-1">Invalidation</p>
                <p className="text-sm text-zinc-400">{ti.aiAnalysis.invalidation_summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guardian Checks */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4"/>Guardian Checks</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {gd.checks.map((c, i) => (
            <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${c.passed ? "bg-white/[0.01]" : "bg-red-500/[0.04]"}`}>
              <div className="flex items-center gap-3">
                {c.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                <div>
                  <p className="text-sm text-zinc-300">{c.name}</p>
                  <p className="text-xs text-zinc-600">{c.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className={c.passed ? "text-zinc-500" : "text-red-400"}>{c.value}</span>
                <span className="text-zinc-700">{c.threshold}</span>
              </div>
            </div>
          ))}
          <div className="mt-3 rounded-lg bg-white/[0.02] p-4">
            <p className="text-sm text-zinc-400">{gd.auditSummary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Execution */}
      {ex && (
        <Card>
          <CardHeader><CardTitle>Execution Result</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: "Order ID", v: ex.orderId },
                { l: "Status", v: ex.status },
                { l: "Filled Price", v: ex.filledPrice ? formatCurrency(ex.filledPrice) : "—" },
                { l: "Mode", v: ex.mode.toUpperCase() },
              ].map(d => (
                <div key={d.l} className="rounded-lg bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-600">{d.l}</p>
                  <p className="text-sm text-zinc-300 font-mono mt-0.5">{d.v}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Position */}
      {pos && (
        <Card>
          <CardHeader><CardTitle>Position</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {[
                { l: "Entry", v: formatCurrency(pos.entryPrice) },
                { l: "Size", v: String(pos.size) },
                { l: "Status", v: pos.status },
                { l: "P&L", v: pos.pnl != null ? formatCurrency(pos.pnl) : "—", c: pos.pnl && pos.pnl > 0 ? "text-emerald-400" : "text-red-400" },
                { l: "Stop Loss", v: formatCurrency(pos.stopLoss) },
              ].map(d => (
                <div key={d.l} className="rounded-lg bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-600">{d.l}</p>
                  <p className={`text-sm font-mono mt-0.5 ${d.c || "text-zinc-300"}`}>{d.v}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Artifacts */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4"/>Validation Artifacts ({artifacts.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {artifacts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm text-zinc-300">{a.summary}</p>
                    <p className="text-xs text-zinc-700 font-mono">{a.type} · {a.hash.slice(0, 18)}...</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px]">{a.registryStatus}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
