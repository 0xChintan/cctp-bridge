# CCTP Bridge

A native USDC bridge across EVM testnets using **Circle's CCTP V2** (Cross-Chain Transfer Protocol). Burns USDC on the source chain, polls Circle's Iris attestation service, and mints native USDC on the destination — no wrapped assets, no liquidity pools.

## Quick start

```bash
npm install
cp .env.example .env   # add a free WalletConnect projectId from cloud.reown.com
npm run dev
```

Open http://localhost:5173. Connect a wallet, grab testnet USDC from [faucet.circle.com](https://faucet.circle.com), and bridge.

## Stack

- **Vite + React + TypeScript**
- **wagmi + viem** for chain interactions
- **RainbowKit** for the wallet UI (MetaMask, Coinbase, WalletConnect, …)
- **Tailwind CSS**
- **React Router** for routing

## Supported testnets (CCTP V2)

| Chain | Domain | USDC |
|---|---|---|
| Ethereum Sepolia | 0 | ✓ |
| Avalanche Fuji | 1 | ✓ |
| OP Sepolia | 2 | ✓ |
| Arbitrum Sepolia | 3 | ✓ |
| Base Sepolia | 6 | ✓ |
| Polygon Amoy | 7 | ✓ |
| Unichain Sepolia | 10 | ✓ |

## Features

- **Fast (~10–20s) and Standard (free) transfer modes** with live fee from Circle's `/v2/burn/USDC/fees` endpoint and 1.2× buffer.
- **Resume on refresh.** If the page reloads mid-flight, a "Pending bridge" card appears below the form so you can continue later.
- **Manual claim.** Paste a burn tx hash to fetch the attestation and mint — useful when persistence is lost or you burned via another tool.
- **One-click retry.** If a step errors after the burn, "Retry from last step" picks up where it stopped.
- **Already-minted detection.** Pre-mint simulate catches "nonce already used" so you don't burn gas on a guaranteed revert.
- **Per-chain burn-limit guard** read from `TokenMinter.burnLimitsPerMessage(USDC)` at runtime.
- **Transfer history table** with explorer links per row, persisted to `localStorage`.
- **Short, human-readable error messages.** Raw errors go to `console.error`.
- **In-app docs** for chains, domains, V2 contracts, and Fast vs Standard.

## Project layout

```
src/
├── components/        Bridge form, ChainSelect, History, ProgressTracker, …
├── hooks/             useBridge (run/resume/claim), useHistory, useBurnLimit
├── lib/
│   ├── cctp.ts        Chains, domains, V2 contract addresses
│   ├── abis.ts        Minimal V2 ABIs
│   ├── attestation.ts Iris polling
│   ├── feeApi.ts      Live Fast Transfer fee fetch + buffer
│   ├── persistence.ts Pending-transfer storage
│   ├── history.ts     Transfer history storage
│   └── errorMessages.ts  humanizeError mapping
├── pages/Docs.tsx     /docs route
└── App.tsx            BrowserRouter setup
```

## Environment variables

```
VITE_WALLETCONNECT_PROJECT_ID=...   # free at https://cloud.reown.com
```

Without it, WalletConnect won't work but injected wallets (MetaMask, Coinbase) still do.

## Testing tips

- **First run:** Avalanche Fuji → Base Sepolia, **Fast** mode, 0.5 USDC. End-to-end in ~30s.
- **Long-wait path:** Anything → Sepolia, Standard mode, to test the 13–19 min attestation poll.
- Get gas faucets from the in-app **Help panel** below the form — links auto-update for the chain pair you've selected.

## Scripts

```bash
npm run dev         # Vite dev server
npm run build       # tsc + vite build
npm run preview     # serve dist/
npm run typecheck   # tsc --noEmit
```

## References

- [CCTP V2 docs](https://developers.circle.com/cctp)
- [V2 contract addresses](https://developers.circle.com/cctp/evm-smart-contracts)
- [Reference repo (Circle)](https://github.com/circlefin/circle-cctp-crosschain-transfer)
# cctp-crosschain-transfers
