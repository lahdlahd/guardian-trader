/**
 * GET /api/export-artifacts
 * Exports all validation artifacts and registry events as downloadable JSON.
 * Full ERC-8004 compliance artifact bundle.
 */

import { NextResponse } from "next/server";
import { getERC8004Adapter } from "@/lib/erc8004/adapter";
import { AGENT, REPUTATION } from "@/lib/demo/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const adapter = getERC8004Adapter();
  const artifacts = await adapter.getAllArtifacts();
  const events = adapter.getEventLog();
  const agent = await adapter.getAgentIdentity("agent-001");
  const reputation = await adapter.getReputation("agent-001");

  const bundle = {
    _meta: {
      schema: "ERC-8004-ValidationBundle",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      agentId: "agent-001",
      domain: {
        name: "GuardianTrader",
        version: "1",
        chainId: 1,
        verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      },
    },
    agent: agent || AGENT,
    reputation: reputation || REPUTATION,
    artifacts: artifacts.map(a => ({
      ...a,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    })),
    registryEvents: events,
    statistics: {
      totalArtifacts: artifacts.length,
      totalEvents: events.length,
      artifactsByType: artifacts.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageScore: artifacts.length > 0
        ? Math.round(artifacts.reduce((s, a) => s + (a.score || 0), 0) / artifacts.length)
        : 0,
    },
  };

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="guardian-trader-erc8004-artifacts-${Date.now()}.json"`,
    },
  });
}
