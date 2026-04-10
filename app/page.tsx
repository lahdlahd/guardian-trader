"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, TrendingUp, TrendingDown, DollarSign, CheckCircle2, XCircle, Pause, AlertTriangle, Eye,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ACCOUNT_STATE, REPUTATION, SCENARIOS, EQUITY_CURVE, DAILY_METRICS } from "@/lib/demo/data";
import { LivePipelineRunner } from "@/components/dashboard/live-pipeline";
import { LiveTicker, AgentControlPanel } from "@/components/dashboard/live-agent";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from "recharts";
import Link from "next/link";

const vc: Record<string, { color: "success"|"warning"|"danger"|"purple"; icon: typeof CheckCircle2; label: string }> = {
  APPROVE: { color: "success", icon: CheckCircle2, label: "Approved" },
  APPROVE_WITH_REDUCED_SIZE: { color: "warning", icon: AlertTriangle, label: "Reduced" },
  BLOCK: { color: "danger", icon: XCircle, label: "Blocked" },
  PAUSE_TRADING: { color: "purple", icon: Pause, label: "Paused" },
};

const colorMap = { success: "text-emerald-400", warning: "text-amber-400", danger: "text-red-400", purple: "text-violet-400" };

function Stat({ title, value, sub, icon: Icon, color }: { title: string; value: string; sub?: string; icon: React.ComponentType<{className?:string}>; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-zinc-600">{sub}</p>}
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2"><Icon className={`h-4 w-4 ${color}`} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskBar({ label, value, max, pct, color }: { label: string; value: string; max: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className={color}>{value} / {max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color.replace("text-","bg-").replace("400","500/60")}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function Page() {
  const approved = SCENARIOS.filter(s => ["APPROVE","APPROVE_WITH_REDUCED_SIZE"].includes(s.guardianDecision.verdict)).length;
  const blocked = SCENARIOS.length - approved;
  const chartData = DAILY_METRICS.slice(-14).map(m => ({ date: m.date.slice(5), approved: m.approvedTrades, blocked: m.blockedTrades }));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 mt-0.5">Risk-first autonomous trading — every trade passes the Guardian</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />Demo Mode</Badge>
          <Badge variant="info">Regime: trending</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Equity" value={formatCurrency(ACCOUNT_STATE.equity)} sub="Available: $94,200" icon={DollarSign} color="text-white" />
        <Stat title="Today P&L" value={formatCurrency(ACCOUNT_STATE.dailyPnl)} sub="+1.24%" icon={TrendingUp} color="text-emerald-400" />
        <Stat title="Max Drawdown" value={formatPercent(-ACCOUNT_STATE.dailyDrawdown)} sub="Limit: 3%" icon={TrendingDown} color="text-amber-400" />
        <Stat title="Trust Score" value={`${REPUTATION.trustScore}/100`} sub="Validation: 88" icon={Shield} color="text-violet-400" />
      </div>

      {/* Live Market Data from Kraken */}
      <LiveTicker />

      <div className="grid grid-cols-4 gap-4">
        <Card className="col-span-1">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Risk Budget</p>
            <div className="space-y-3">
              <RiskBar label="Daily Drawdown" value={`${(ACCOUNT_STATE.dailyDrawdown*100).toFixed(1)}%`} max="3%" pct={(ACCOUNT_STATE.dailyDrawdown/0.03)*100} color="text-amber-400" />
              <RiskBar label="Open Positions" value={String(ACCOUNT_STATE.openPositionsCount)} max="2" pct={50} color="text-sky-400" />
              <RiskBar label="Consec. Losses" value={String(ACCOUNT_STATE.consecutiveLosses)} max="2" pct={0} color="text-emerald-400" />
            </div>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-zinc-500">Trades Today</span>
              <span className="text-zinc-300">{approved} ✓ / {blocked} ✗</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader><CardTitle>Equity Curve (30d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={EQUITY_CURVE}>
                <defs><linearGradient id="eG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fill:"#52525b",fontSize:10}} tickLine={false} axisLine={false} domain={["dataMin-500","dataMax+500"]} tickFormatter={(v:number)=>`$${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{background:"rgba(10,10,15,0.95)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,fontSize:12}} labelStyle={{color:"#a1a1aa"}}/>
                <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} fill="url(#eG)"/>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle>Guardian Decisions (14d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false}/>
                <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fill:"#52525b",fontSize:10}} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{background:"rgba(10,10,15,0.95)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,fontSize:12}}/>
                <Bar dataKey="approved" fill="#10b981" radius={[3,3,0,0]}/>
                <Bar dataKey="blocked" fill="#ef4444" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest Trades</CardTitle>
            <Link href="/trade-feed" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">View all →</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {SCENARIOS.map(s => {
                const v = vc[s.guardianDecision.verdict];
                return (
                  <Link key={s.id} href={`/audit/${s.id}`} className="flex items-center justify-between rounded-lg p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                    <div className="flex items-center gap-3">
                      <v.icon className={`h-4 w-4 ${colorMap[v.color]}`}/>
                      <div>
                        <p className="text-sm text-zinc-300 font-medium">{s.tradeIntent.symbol} {s.tradeIntent.side.toUpperCase()}</p>
                        <p className="text-xs text-zinc-600 truncate max-w-[300px]">{s.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={v.color}>{v.label}</Badge>
                      <span className="text-xs text-zinc-700 font-mono">{s.guardianDecision.riskScore}</span>
                      <Eye className="h-3.5 w-3.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Autonomous Agent + Live Pipeline */}
      <AgentControlPanel />
      <LivePipelineRunner />
    </div>
  );
}
