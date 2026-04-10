import { NextResponse } from "next/server";
import { getERC8004Adapter } from "@/lib/erc8004/adapter";
import { AGENT, REPUTATION } from "@/lib/demo/data";

export async function POST() {
  const adapter = getERC8004Adapter();
  const { txHash: idTx } = await adapter.registerAgentIdentity(AGENT);
  const { txHash: repTx } = await adapter.updateReputation(REPUTATION);
  return NextResponse.json({
    agent: AGENT,
    reputation: REPUTATION,
    txHashes: { identity: idTx, reputation: repTx },
    events: adapter.getEventLog(),
  });
}

export async function GET() {
  const adapter = getERC8004Adapter();
  const agent = await adapter.getAgentIdentity("agent-001");
  const rep = await adapter.getReputation("agent-001");
  return NextResponse.json({ agent, reputation: rep, events: adapter.getEventLog() });
}
