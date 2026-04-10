import { NextResponse } from "next/server";
import { getERC8004Adapter } from "@/lib/erc8004/adapter";

export async function GET() {
  const adapter = getERC8004Adapter();
  const artifacts = await adapter.getAllArtifacts();
  const events = adapter.getEventLog();
  return NextResponse.json({ artifacts, events, count: artifacts.length });
}
