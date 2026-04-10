"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Shield, BarChart3, Target, AlertTriangle } from "lucide-react";
import { DAILY_METRICS, REPUTATION, SCENARIOS } from "@/lib/demo/data";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function LeaderboardPage() {
  const latest = DAILY_METRICS[DAILY_METRICS.length - 1];
  const totalPnl = DAILY_METRICS.reduce((s, m) => s + m.pnl, 0);
  const avgWinRate = DAILY_METRICS.reduce((s, m) => s + m.winRate, 0) / DAILY_METRICS.length;
  const maxDD = Math.max(...DAILY_METRICS.map(m => m.drawdown));
  const avgSharpe = DAILY_METRICS.reduce((s, m) => s + m.sharpeLike, 0) / DAILY_METRICS.length;
  const totalBlocked = DAILY_METRICS.reduce((s, m) => s + m.blockedTrades, 0);
  const totalApproved = DAILY_METRICS.reduce((s, m) => s + m.approvedTrades, 0);

  const radar = [
    { metric: "P&L", value: REPUTATION.pnlScore },
    { metric: "Drawdown", value: REPUTATION.drawdownScore },
    { metric: "Validation", value: REPUTATION.validationScore },
    { metric: "Trust", value: REPUTATION.trustScore },
    { metric: "Win Rate", value: Math.round(avgWinRate * 100) },
    { metric: "Risk Mgmt", value: 90 },
  ];

  const metrics = [
    { label: "Net P&L", value: `$${totalPnl.toLocaleString()}`, color: "text-emerald-400", icon: TrendingUp },
    { label: "Avg Win Rate", value: `${(avgWinRate * 100).toFixed(1)}%`, color: "text-sky-400", icon: Target },
    { label: "Max Drawdown", value: `${(maxDD * 100).toFixed(2)}%`, color: "text-amber-400", icon: AlertTriangle },
    { label: "Sharpe-Like", value: avgSharpe.toFixed(2), color: "text-violet-400", icon: BarChart3 },
    { label: "Blocked Trades", value: String(totalBlocked), color: "text-red-400", icon: Shield },
    { label: "Approved Trades", value: String(totalApproved), color: "text-emerald-400", icon: Trophy },
  ];

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" /> Leaderboard Metrics
        </h1>
        <p className="text-sm text-zinc-600 mt-0.5">Performance metrics optimized for hackathon judging criteria</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{m.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${m.color}`}>{m.value}</p>
                </div>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Agent Performance Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radar}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#71717a", fontSize: 11 }} />
                <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Daily P&L (30d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={DAILY_METRICS}>
                <defs>
                  <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip contentStyle={{ background: "rgba(10,10,15,0.95)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} fill="url(#pG)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trust Score Breakdown */}
      <Card>
        <CardHeader><CardTitle>Trust Score Composition</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "P&L Performance", score: REPUTATION.pnlScore, weight: "25%", color: "bg-emerald-500" },
              { label: "Drawdown Control", score: REPUTATION.drawdownScore, weight: "30%", color: "bg-sky-500" },
              { label: "Validation Quality", score: REPUTATION.validationScore, weight: "25%", color: "bg-amber-500" },
              { label: "Trust Composite", score: REPUTATION.trustScore, weight: "20%", color: "bg-violet-500" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-4">
                <span className="text-xs text-zinc-500 w-36">{s.label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}/60`} style={{ width: `${s.score}%` }} />
                </div>
                <span className="text-sm font-bold text-zinc-300 w-10 text-right">{s.score}</span>
                <span className="text-xs text-zinc-700 w-10">{s.weight}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
