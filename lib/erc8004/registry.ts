/**
 * ERC-8004 Registry — Structured On-Chain Simulation
 *
 * Three registries per spec:
 *   1. Agent Identity Registry
 *   2. Reputation Registry
 *   3. Validation Registry
 *
 * All entries are EIP-712 typed-data hashed and signed.
 * Event log simulates on-chain event emission.
 * Swap to real contracts by implementing the same interface.
 */

import type {
  AgentIdentity,
  ReputationScore,
  ValidationArtifact,
  TradeIntent,
} from "@/lib/types";
import { createHash, randomBytes } from "crypto";

// ─── EIP-712 Domain ─────────────────────────────────────────

export const EIP712_DOMAIN = {
  name: "GuardianTrader",
  version: "1",
  chainId: 1, // EIP-155 chain ID
  verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
};

export const TRADE_INTENT_TYPES = [
  { name: "symbol", type: "string" },
  { name: "side", type: "string" },
  { name: "entry", type: "uint256" },
  { name: "stopLoss", type: "uint256" },
  { name: "takeProfit", type: "uint256" },
  { name: "confidence", type: "uint256" },
  { name: "proposedSize", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "timestamp", type: "uint256" },
];

export const VALIDATION_ARTIFACT_TYPES = [
  { name: "artifactType", type: "string" },
  { name: "entityId", type: "string" },
  { name: "entityType", type: "string" },
  { name: "payloadHash", type: "bytes32" },
  { name: "actorId", type: "string" },
  { name: "timestamp", type: "uint256" },
];

// ─── Hashing Utilities ──────────────────────────────────────

export function hashTypedData(
  domainSeparator: string,
  structHash: string
): string {
  // EIP-712: encode(domainSeparator, hashStruct(message))
  const payload = `0x1901${domainSeparator}${structHash}`;
  return "0x" + createHash("sha256").update(payload).digest("hex");
}

export function hashStruct(data: Record<string, unknown>): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return createHash("sha256").update(serialized).digest("hex");
}

export function computeDomainSeparator(): string {
  return hashStruct(EIP712_DOMAIN);
}

function mockSignature(): string {
  return "0x" + randomBytes(65).toString("hex");
}

function mockTxHash(): string {
  return "0x" + randomBytes(32).toString("hex");
}

export function hashPayload(payload: Record<string, unknown>): string {
  return "0x" + createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// ─── Event Log (simulates on-chain events) ──────────────────

export interface RegistryEvent {
  eventName: string;
  registry: "identity" | "reputation" | "validation";
  txHash: string;
  blockNumber: number;
  timestamp: number;
  data: Record<string, unknown>;
}

// ─── Interface ──────────────────────────────────────────────

export interface ERC8004Adapter {
  registerAgentIdentity(agent: AgentIdentity): Promise<{ txHash: string; blockNumber: number }>;
  getAgentIdentity(agentId: string): Promise<AgentIdentity | null>;
  updateReputation(score: ReputationScore): Promise<{ txHash: string; blockNumber: number }>;
  getReputation(agentId: string): Promise<ReputationScore | null>;
  submitValidationArtifact(artifact: ValidationArtifact): Promise<{ txHash: string; artifactId: string; blockNumber: number }>;
  getValidationArtifacts(entityId: string): Promise<ValidationArtifact[]>;
  getAllArtifacts(): Promise<ValidationArtifact[]>;
  signTradeIntent(intent: TradeIntent): Promise<{ signature: string; typedData: Record<string, unknown>; hash: string }>;
  signValidationArtifact(artifact: ValidationArtifact): Promise<{ signature: string; hash: string }>;
  getEventLog(): RegistryEvent[];
  getStats(): { agents: number; artifacts: number; reputationUpdates: number; events: number };
}

// ─── In-Memory Implementation ───────────────────────────────

let _blockNumber = 1000;
function nextBlock(): number {
  return ++_blockNumber;
}

class InMemoryERC8004Registry implements ERC8004Adapter {
  private agents = new Map<string, AgentIdentity>();
  private reputations = new Map<string, ReputationScore>();
  private artifactsByEntity = new Map<string, ValidationArtifact[]>();
  private allArtifacts: ValidationArtifact[] = [];
  private events: RegistryEvent[] = [];
  private nonce = 0;

  private emit(eventName: string, registry: RegistryEvent["registry"], data: Record<string, unknown>): { txHash: string; blockNumber: number } {
    const txHash = mockTxHash();
    const blockNumber = nextBlock();
    this.events.push({
      eventName,
      registry,
      txHash,
      blockNumber,
      timestamp: Date.now(),
      data: { ...data, txHash },
    });
    return { txHash, blockNumber };
  }

  // ── Identity Registry ───────────────────────────────────

  async registerAgentIdentity(agent: AgentIdentity) {
    this.agents.set(agent.id, {
      ...agent,
      registryTxHash: undefined, // will be set from emit
    });
    const result = this.emit("AgentRegistered", "identity", {
      agentId: agent.id,
      name: agent.name,
      walletAddress: agent.walletAddress,
      capabilities: agent.capabilities,
    });
    // update with txHash
    this.agents.set(agent.id, { ...agent, registryTxHash: result.txHash });
    return result;
  }

  async getAgentIdentity(agentId: string) {
    return this.agents.get(agentId) ?? null;
  }

  // ── Reputation Registry ─────────────────────────────────

  async updateReputation(score: ReputationScore) {
    this.reputations.set(score.agentId, score);
    return this.emit("ReputationUpdated", "reputation", {
      agentId: score.agentId,
      trustScore: score.trustScore,
      pnlScore: score.pnlScore,
      drawdownScore: score.drawdownScore,
      validationScore: score.validationScore,
    });
  }

  async getReputation(agentId: string) {
    return this.reputations.get(agentId) ?? null;
  }

  // ── Validation Registry ─────────────────────────────────

  async submitValidationArtifact(artifact: ValidationArtifact) {
    // Sign the artifact
    const { signature, hash } = await this.signValidationArtifact(artifact);
    const signedArtifact: ValidationArtifact = {
      ...artifact,
      hash,
      registryStatus: "verified",
    };

    const existing = this.artifactsByEntity.get(artifact.entityId) ?? [];
    existing.push(signedArtifact);
    this.artifactsByEntity.set(artifact.entityId, existing);
    this.allArtifacts.push(signedArtifact);

    const result = this.emit("ValidationArtifactSubmitted", "validation", {
      artifactId: artifact.id,
      type: artifact.type,
      entityId: artifact.entityId,
      hash,
      signature: signature.slice(0, 20) + "...",
      score: artifact.score,
    });

    return { ...result, artifactId: artifact.id };
  }

  async getValidationArtifacts(entityId: string) {
    return this.artifactsByEntity.get(entityId) ?? [];
  }

  async getAllArtifacts() {
    return [...this.allArtifacts];
  }

  // ── EIP-712 Signing ─────────────────────────────────────

  async signTradeIntent(intent: TradeIntent) {
    this.nonce++;
    const message = {
      symbol: intent.symbol,
      side: intent.side,
      entry: Math.round(intent.entry * 1e8),
      stopLoss: Math.round(intent.stopLoss * 1e8),
      takeProfit: Math.round(intent.takeProfit * 1e8),
      confidence: Math.round(intent.confidence * 1000),
      proposedSize: Math.round(intent.proposedSize * 1e8),
      nonce: this.nonce,
      timestamp: Math.floor(intent.createdAt.getTime() / 1000),
    };

    const typedData = {
      types: { TradeIntent: TRADE_INTENT_TYPES },
      primaryType: "TradeIntent",
      domain: EIP712_DOMAIN,
      message,
    };

    const domainSep = computeDomainSeparator();
    const structH = hashStruct(message);
    const hash = hashTypedData(domainSep, structH);
    const signature = mockSignature();

    return { signature, typedData, hash };
  }

  async signValidationArtifact(artifact: ValidationArtifact) {
    const message = {
      artifactType: artifact.type,
      entityId: artifact.entityId,
      entityType: artifact.entityType,
      payloadHash: hashPayload(artifact.payload),
      actorId: artifact.actorId,
      timestamp: Math.floor(artifact.createdAt.getTime() / 1000),
    };

    const domainSep = computeDomainSeparator();
    const structH = hashStruct(message);
    const hash = hashTypedData(domainSep, structH);
    const signature = mockSignature();

    return { signature, hash };
  }

  // ── Queries ─────────────────────────────────────────────

  getEventLog() {
    return [...this.events];
  }

  getStats() {
    return {
      agents: this.agents.size,
      artifacts: this.allArtifacts.length,
      reputationUpdates: this.events.filter(e => e.registry === "reputation").length,
      events: this.events.length,
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────

let _instance: InMemoryERC8004Registry | null = null;

export function getERC8004Registry(): ERC8004Adapter & { getEventLog: () => RegistryEvent[]; getStats: () => ReturnType<InMemoryERC8004Registry["getStats"]> } {
  if (!_instance) _instance = new InMemoryERC8004Registry();
  return _instance;
}
