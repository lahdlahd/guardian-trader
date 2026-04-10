# 🛡️ Guardian Trader

**Autonomous AI Trading Agent with Risk-First Design**

> Every trade must pass the Guardian. No exceptions.

Built for the [lablab.ai AI Trading Agents Hackathon](https://lablab.ai) — targeting both the **Kraken Challenge** and **ERC-8004 Challenge**.

---

## What is Guardian Trader?

Guardian Trader is an autonomous AI trading agent that analyzes crypto market signals and proposes trades, but **every trade must pass through a deterministic Guardian risk layer** before execution.

The Guardian can:
- ✅ **APPROVE** — all checks passed
- ⚠️ **APPROVE_WITH_REDUCED_SIZE** — approved with adaptive position sizing
- 🚫 **BLOCK** — critical risk violation detected
- ⏸️ **PAUSE_TRADING** — automatic cooldown activated

## Key Differentiators

- **Risk-first architecture** — Guardian validates 10 deterministic checks per trade
- **AI assists, never decides** — structured AI analysis, deterministic execution
- **Full audit trail** — every action emits a validation artifact
- **ERC-8004 compliant** — agent identity, reputation, and validation registries
- **Kraken CLI ready** — adapter layer for live/paper trading

## Quick Start

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — equity, P&L, risk budget, charts |
| `/trade-feed` | Timeline of all trade proposals |
| `/guardian` | **Hero page** — detailed risk checklist per trade |
| `/audit/[id]` | Full audit trail for a single trade |
| `/identity` | ERC-8004 agent identity registry |
| `/leaderboard` | Performance metrics & radar chart |
| `/social` | Build-in-public shareable posts |

## Architecture

```
Signal Engine → AI Analyst → Guardian Risk Engine → Execution Layer
                                    ↓
                          Validation Artifacts
                                    ↓
                        ERC-8004 Registries
```

## Guardian Risk Checks (10 per trade)

1. Stop-loss present (mandatory)
2. Risk per trade ≤ 1% of equity
3. Daily drawdown ≤ 3%
4. Volatility-adaptive sizing
5. Confidence ≥ 0.65
6. Open positions ≤ 2
7. Correlation exposure ≤ 0.7
8. Consecutive loss cooldown
9. Spread/slippage check
10. Symbol whitelist

## Demo Scenarios

6 pre-built scenarios showcase every Guardian verdict:

1. BTC long — fully approved
2. ETH long — approved at 50% (volatility)
3. BTC long — blocked (daily drawdown)
4. ETH long — blocked (correlation)
5. BTC long — blocked (no stop-loss)
6. ETH long — paused (consecutive losses)

## Tech Stack

- Next.js 16+ / TypeScript / Tailwind CSS
- Prisma (SQLite) / Zod schemas
- Recharts / lucide-react
- Mock Kraken CLI adapter
- Mock ERC-8004 registry adapter

## License

MIT
