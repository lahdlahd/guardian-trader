import { createPublicClient, createWalletClient, http, parseAbi, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`;
const abi = parseAbi([
  "function register() external returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string newURI) external",
  "function tokenURI(uint256 agentId) external view returns (string)",
  "function ownerOf(uint256 agentId) external view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("PRIVATE_KEY=0x... npx tsx scripts/register-agent.ts"); process.exit(1); }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
  const pub = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });

  console.log("🛡️ Guardian Trader — ERC-8004 Registration (Sepolia)");
  console.log("Wallet:", account.address);

  const bal = await pub.getBalance({ address: account.address });
  console.log("Balance:", (Number(bal) / 1e18).toFixed(6), "ETH");
  if (bal < BigInt(100000000000000)) { console.error("Need Sepolia ETH: https://www.alchemy.com/faucets/ethereum-sepolia"); process.exit(1); }

  console.log("\n1. Registering agent...");
  const regHash = await wallet.writeContract({ address: REGISTRY, abi, functionName: "register" });
  console.log("   Tx:", regHash);
  const receipt = await pub.waitForTransactionReceipt({ hash: regHash });
  const logs = parseEventLogs({ abi, eventName: "Transfer", logs: receipt.logs });
  const agentId = logs.length > 0 ? (logs[0].args as any).tokenId : BigInt(0);
  console.log("   ✅ Agent ID:", agentId.toString());

  console.log("\n2. Setting agent URI...");
  const card = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Guardian Trader",
    description: "Autonomous AI trading agent with risk-first Guardian validation. Every trade passes 10 deterministic risk checks before execution. BTC/USD & ETH/USD via Kraken.",
    services: [{ name: "web", endpoint: "https://guardian-trader.vercel.app" }],
    active: true,
    registrations: [{ agentId: Number(agentId), agentRegistry: `eip155:11155111:${REGISTRY}` }],
    capabilities: ["spot_trading","risk_management","signal_detection","ai_analysis","guardian_validation","paper_trading"],
  };
  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(card)).toString("base64")}`;
  const uriHash = await wallet.writeContract({ address: REGISTRY, abi, functionName: "setAgentURI", args: [agentId, uri] });
  console.log("   Tx:", uriHash);
  await pub.waitForTransactionReceipt({ hash: uriHash });
  console.log("   ✅ URI set!");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🛡️ REGISTERED ON-CHAIN");
  console.log("Agent ID:    ", agentId.toString());
  console.log("Registry:    ", REGISTRY);
  console.log("Full ID:      eip155:11155111:" + REGISTRY + ":" + agentId);
  console.log("Owner:       ", account.address);
  console.log("Register Tx: ", "https://sepolia.etherscan.io/tx/" + regHash);
  console.log("URI Tx:      ", "https://sepolia.etherscan.io/tx/" + uriHash);
  console.log("NFT:         ", `https://sepolia.etherscan.io/nft/${REGISTRY}/${agentId}`);

  const fs = await import("fs");
  fs.writeFileSync("erc8004-registration.json", JSON.stringify({ agentId: Number(agentId), registry: REGISTRY, owner: account.address, registerTx: regHash, uriTx: uriHash, card }, null, 2));
  console.log("\n💾 Saved to erc8004-registration.json");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
