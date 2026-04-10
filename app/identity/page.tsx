"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGENT, REPUTATION, ALL_ARTIFACTS, RISK_POLICY } from "@/lib/demo/data";
import { Fingerprint, Shield, CheckCircle2, FileText, Wallet, Cpu, Award, Loader2, Zap } from "lucide-react";

export default function IdentityPage() {
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState<{ txHashes?: { identity: string; reputation: string }; events?: { type: string; txHash: string; blockNumber: number }[] } | null>(null);
  const [liveData, setLiveData] = useState<{ artifactCount?: number; eventCount?: number; recentEvents?: { type: string; txHash: string; blockNumber: number; timestamp: number }[] } | null>(null);

  const registerAgent = async () => {
    setRegistering(true);
    try {
      const res = await fetch("/api/identity", { method: "POST" });
      const data = await res.json();
      setRegResult(data);
      // Also fetch live state
      const res2 = await fetch("/api/identity");
      setLiveData(await res2.json());
    } catch (err) { console.error(err); }
    setRegistering(false);
  };

  const fetchLiveState = async () => {
    try {
      const res = await fetch("/api/identity");
      setLiveData(await res.json());
    } catch (err) { console.error(err); }
  };
  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
          <Fingerprint className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Agent Identity</h1>
          <p className="text-sm text-zinc-600">ERC-8004 compliant identity registry</p>
        </div>
      </div>

      {/* Identity Card */}
      <Card className="shadow-[0_0_40px_rgba(139,92,246,0.08)]">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-emerald-500/20 border border-white/[0.06] flex items-center justify-center">
                <Shield className="h-8 w-8 text-white/60" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{AGENT.name}</h2>
                <p className="text-xs text-zinc-600 font-mono mt-0.5">{AGENT.walletAddress}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="success">Active</Badge>
                  <Badge variant="purple">ERC-8004</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-violet-400">{REPUTATION.trustScore}</p>
              <p className="text-xs text-zinc-600">Trust Score</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { l: "P&L Score", v: REPUTATION.pnlScore, c: "text-emerald-400" },
              { l: "Drawdown Score", v: REPUTATION.drawdownScore, c: "text-sky-400" },
              { l: "Validation Score", v: REPUTATION.validationScore, c: "text-amber-400" },
              { l: "Trust Score", v: REPUTATION.trustScore, c: "text-violet-400" },
            ].map(s => (
              <div key={s.l} className="rounded-xl bg-white/[0.03] p-4 text-center">
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{s.l}</p>
                <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full ${s.c.replace("text-","bg-").replace("400","500/60")}`} style={{width:`${s.v}%`}} />
                </div>
              </div>
            ))}
          </div>

          {/* Capabilities */}
          <div className="mb-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> Capabilities
            </p>
            <div className="flex flex-wrap gap-2">
              {AGENT.capabilities.map(c => (
                <Badge key={c} variant="info">{c.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>

          {/* Registry Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/[0.02] p-3">
              <p className="text-xs text-zinc-600 flex items-center gap-1"><Wallet className="h-3 w-3"/>Registry Tx</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{AGENT.registryTxHash}</p>
            </div>
            <div className="rounded-lg bg-white/[0.02] p-3">
              <p className="text-xs text-zinc-600 flex items-center gap-1"><FileText className="h-3 w-3"/>Total Artifacts</p>
              <p className="text-sm text-zinc-300 font-mono mt-0.5">{ALL_ARTIFACTS.length} verified</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whitelisted Markets */}
      <Card>
        <CardHeader><CardTitle>Whitelisted Markets</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {RISK_POLICY.whitelistedSymbols.map(s => (
              <div key={s} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-6 py-4 text-center">
                <p className="text-sm font-bold text-white">{s}</p>
                <p className="text-xs text-zinc-600 mt-0.5">Spot Only</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* EIP-712 Schema */}
      <Card>
        <CardHeader><CardTitle>EIP-712 Typed Data Schema</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs text-zinc-500 font-mono bg-white/[0.02] rounded-lg p-4 overflow-x-auto">{JSON.stringify({
            types: {
              TradeIntent: [
                { name: "symbol", type: "string" },
                { name: "side", type: "string" },
                { name: "entry", type: "uint256" },
                { name: "stopLoss", type: "uint256" },
                { name: "takeProfit", type: "uint256" },
                { name: "confidence", type: "uint256" },
                { name: "proposedSize", type: "uint256" },
                { name: "timestamp", type: "uint256" },
              ],
            },
            primaryType: "TradeIntent",
            domain: { name: "GuardianTrader", version: "1", chainId: 1, verifyingContract: "0x..." },
          }, null, 2)}</pre>
        </CardContent>
      </Card>

      {/* Live Registry Actions */}
      <Card className="border-violet-500/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-violet-400" />
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">On-Chain Registry (Simulation)</p>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={registerAgent}
              disabled={registering}
              className="flex items-center gap-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20 px-4 py-2 text-sm text-violet-400 transition-all disabled:opacity-50"
            >
              {registering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />}
              Register Agent On-Chain
            </button>
            <button
              onClick={fetchLiveState}
              className="flex items-center gap-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2 text-sm text-zinc-400 transition-all"
            >
              <FileText className="h-3.5 w-3.5" />
              Fetch Registry State
            </button>
          </div>

          {regResult?.txHashes && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-emerald-400">✓ Agent registered successfully</p>
              <div className="rounded bg-white/[0.02] p-2.5">
                <p className="text-[10px] text-zinc-600">Identity Tx</p>
                <p className="text-[10px] text-zinc-500 font-mono break-all">{regResult.txHashes.identity}</p>
              </div>
              <div className="rounded bg-white/[0.02] p-2.5">
                <p className="text-[10px] text-zinc-600">Reputation Tx</p>
                <p className="text-[10px] text-zinc-500 font-mono break-all">{regResult.txHashes.reputation}</p>
              </div>
            </div>
          )}

          {liveData && (
            <div className="space-y-2">
              <div className="flex gap-4 text-xs">
                <span className="text-zinc-500">Artifacts: <span className="text-zinc-300">{liveData.artifactCount || 0}</span></span>
                <span className="text-zinc-500">Events: <span className="text-zinc-300">{liveData.eventCount || 0}</span></span>
              </div>
              {liveData.recentEvents && liveData.recentEvents.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Recent Registry Events</p>
                  {liveData.recentEvents.map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-white/[0.02] px-2.5 py-1">
                      <span className="text-[10px] text-zinc-500">{e.type}</span>
                      <div className="flex gap-3 text-[10px] font-mono text-zinc-700">
                        <span>#{e.blockNumber}</span>
                        <span className="truncate max-w-[140px]">{e.txHash.slice(0, 18)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
