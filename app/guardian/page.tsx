"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, CheckCircle2, XCircle, AlertTriangle, Pause, ChevronDown, ChevronUp, Activity, Lock,
} from "lucide-react";
import { SCENARIOS, RISK_POLICY } from "@/lib/demo/data";
import type { GuardianCheck, GuardianVerdict } from "@/lib/types";
import Link from "next/link";

const verdictStyle: Record<string, { bg: string; border: string; text: string; icon: typeof CheckCircle2; label: string; glow: string }> = {
  APPROVE: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", icon: CheckCircle2, label: "APPROVED", glow: "shadow-[0_0_30px_rgba(16,185,129,0.15)]" },
  APPROVE_WITH_REDUCED_SIZE: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: AlertTriangle, label: "APPROVED @ 50%", glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]" },
  BLOCK: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: XCircle, label: "BLOCKED", glow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]" },
  PAUSE_TRADING: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", icon: Pause, label: "PAUSED", glow: "shadow-[0_0_30px_rgba(139,92,246,0.15)]" },
};

function CheckRow({ check }: { check: GuardianCheck }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${check.passed ? "bg-white/[0.01]" : "bg-red-500/[0.04]"}`}>
      <div className="flex items-center gap-3">
        {check.passed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        ) : check.severity === "warning" ? (
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
        )}
        <div>
          <p className="text-sm text-zinc-300">{check.name}</p>
          <p className="text-xs text-zinc-600">{check.message}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className={check.passed ? "text-zinc-500" : "text-red-400"}>{check.value}</span>
        <span className="text-zinc-700">{check.threshold}</span>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, isOpen, onToggle }: { scenario: typeof SCENARIOS[0]; isOpen: boolean; onToggle: () => void }) {
  const d = scenario.guardianDecision;
  const vs = verdictStyle[d.verdict];
  const passed = d.checks.filter(c => c.passed).length;
  const total = d.checks.length;

  return (
    <Card className={`transition-all duration-300 ${isOpen ? vs.glow : ""}`}>
      <button onClick={onToggle} className="w-full text-left">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${vs.bg} ${vs.border} border`}>
                <vs.icon className={`h-5 w-5 ${vs.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{scenario.tradeIntent.symbol}</p>
                  <Badge variant={scenario.tradeIntent.side === "long" ? "success" : "danger"}>
                    {scenario.tradeIntent.side.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-zinc-600">conf: {scenario.tradeIntent.confidence}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{scenario.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-sm font-bold ${vs.text}`}>{vs.label}</p>
                <p className="text-xs text-zinc-600">{passed}/{total} checks passed</p>
              </div>
              <div className={`rounded-full p-1 ${vs.bg}`}>
                <span className={`text-lg font-bold ${vs.text}`}>{d.riskScore}</span>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
            </div>
          </div>
        </CardContent>
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.06]">
          <CardContent className="p-5 space-y-4">
            {/* Checks */}
            <div className="space-y-1">
              {d.checks.map((check, i) => (
                <CheckRow key={i} check={check} />
              ))}
            </div>

            {/* Reasons */}
            <div className="rounded-lg bg-white/[0.02] p-4 space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Guardian Reasoning</p>
              {d.reasons.map((r, i) => (
                <p key={i} className="text-sm text-zinc-400">{r}</p>
              ))}
            </div>

            {/* Audit Summary */}
            <div className="rounded-lg bg-white/[0.02] p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Audit Summary</p>
              <p className="text-sm text-zinc-400">{d.auditSummary}</p>
            </div>

            {/* Size */}
            {d.sizeMultiplier > 0 && d.sizeMultiplier < 1 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400">Position size reduced to {d.sizeMultiplier * 100}%</span>
              </div>
            )}

            <div className="flex justify-end">
              <Link href={`/audit/${scenario.id}`} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                Full audit trail →
              </Link>
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}

export default function GuardianPage() {
  const [openId, setOpenId] = useState<string>(SCENARIOS[0].id);

  const stats = {
    approved: SCENARIOS.filter(s => s.guardianDecision.verdict === "APPROVE").length,
    reduced: SCENARIOS.filter(s => s.guardianDecision.verdict === "APPROVE_WITH_REDUCED_SIZE").length,
    blocked: SCENARIOS.filter(s => s.guardianDecision.verdict === "BLOCK").length,
    paused: SCENARIOS.filter(s => s.guardianDecision.verdict === "PAUSE_TRADING").length,
  };

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Guardian Risk Engine</h1>
            <p className="text-sm text-zinc-600">Deterministic validation for every trade — no exceptions</p>
          </div>
        </div>
      </div>

      {/* Policy summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-zinc-500" />
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Risk Policy</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            {[
              { label: "Max Risk/Trade", value: `${RISK_POLICY.maxRiskPerTrade * 100}%` },
              { label: "Max Daily DD", value: `${RISK_POLICY.maxDailyDrawdown * 100}%` },
              { label: "Max Positions", value: String(RISK_POLICY.maxOpenPositions) },
              { label: "Min Confidence", value: String(RISK_POLICY.minConfidence) },
              { label: "Loss Cooldown", value: `${RISK_POLICY.consecutiveLossCooldown} trades` },
            ].map(p => (
              <div key={p.label} className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-600">{p.label}</p>
                <p className="text-sm font-bold text-zinc-300 mt-0.5">{p.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verdict Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Approved", count: stats.approved, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Reduced", count: stats.reduced, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Blocked", count: stats.blocked, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Paused", count: stats.paused, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl ${s.bg} border border-white/[0.06] p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      <div className="space-y-3">
        {SCENARIOS.map(s => (
          <ScenarioCard key={s.id} scenario={s} isOpen={openId === s.id} onToggle={() => setOpenId(openId === s.id ? "" : s.id)} />
        ))}
      </div>
    </div>
  );
}
