"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Pause, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { SCENARIOS } from "@/lib/demo/data";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const vMap: Record<string, { badge: "success"|"warning"|"danger"|"purple"; icon: typeof CheckCircle2; label: string }> = {
  APPROVE: { badge: "success", icon: CheckCircle2, label: "Approved" },
  APPROVE_WITH_REDUCED_SIZE: { badge: "warning", icon: AlertTriangle, label: "Reduced Size" },
  BLOCK: { badge: "danger", icon: XCircle, label: "Blocked" },
  PAUSE_TRADING: { badge: "purple", icon: Pause, label: "Paused" },
};

export default function TradeFeedPage() {
  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Trade Feed</h1>
        <p className="text-sm text-zinc-600 mt-0.5">Timeline of all trade proposals and guardian decisions</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.06]" />
        <div className="space-y-4">
          {SCENARIOS.map((s, idx) => {
            const v = vMap[s.guardianDecision.verdict];
            const ti = s.tradeIntent;
            const colorClass = v.badge === "success" ? "text-emerald-400" : v.badge === "warning" ? "text-amber-400" : v.badge === "danger" ? "text-red-400" : "text-violet-400";
            const bgClass = v.badge === "success" ? "bg-emerald-500" : v.badge === "warning" ? "bg-amber-500" : v.badge === "danger" ? "bg-red-500" : "bg-violet-500";

            return (
              <div key={s.id} className="relative pl-12">
                <div className={`absolute left-[14px] top-6 h-3 w-3 rounded-full ${bgClass} ring-4 ring-[#06060a]`} />
                <Link href={`/audit/${s.id}`}>
                  <Card className="hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">{ti.symbol}</span>
                          <Badge variant={ti.side === "long" ? "success" : "danger"}>
                            {ti.side === "long" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {ti.side.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-zinc-600 font-mono">conf: {ti.confidence}</span>
                        </div>
                        <Badge variant={v.badge}>{v.label}</Badge>
                      </div>

                      <p className="text-sm text-zinc-400 mb-3">{ti.thesis}</p>

                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <span className="text-zinc-600">Entry</span>
                          <p className="text-zinc-300 font-mono mt-0.5">{formatCurrency(ti.entry)}</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <span className="text-zinc-600">Stop Loss</span>
                          <p className="text-red-400 font-mono mt-0.5">{ti.stopLoss ? formatCurrency(ti.stopLoss) : "NONE"}</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <span className="text-zinc-600">Take Profit</span>
                          <p className="text-emerald-400 font-mono mt-0.5">{formatCurrency(ti.takeProfit)}</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <span className="text-zinc-600">Risk Score</span>
                          <p className={`font-mono mt-0.5 ${colorClass}`}>{s.guardianDecision.riskScore}/100</p>
                        </div>
                      </div>

                      {s.guardianDecision.sizeMultiplier > 0 && s.guardianDecision.sizeMultiplier < 1 && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          Size adjusted to {s.guardianDecision.sizeMultiplier * 100}%
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                        <p className="text-xs text-zinc-700">{s.guardianDecision.reasons[0]}</p>
                        <span className="text-xs text-zinc-700">{s.artifacts.length} artifacts</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
