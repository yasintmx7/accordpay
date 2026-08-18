# Build Status

## Implemented

- Next.js App Router interface and responsive navigation
- Approved AccordPay logo, app icon, favicon, and branded homepage treatment
- Mobile invoice cards and desktop data tables with responsive page actions
- Copyable compact wallet addresses and invoice hashes without layout overflow
- Concise RPC/read failures, retry handling, and contextual invoice action states
- EIP-6963 browser-wallet discovery and Arc Testnet switching
- Live Viem contract reads and writes
- Exact USDC approval and atomic create-and-fund flow
- Sent, received, dashboard, and invoice detail views backed by onchain state
- Solidity escrow lifecycle with OpenZeppelin token and reentrancy protections
- Hardhat compile, tests, Ignition deployment, and Arc verification script
- Official Arc/Circle network documentation and deployment instructions

## Verified

- ESLint: passed
- TypeScript: passed
- Solidity 0.8.24 compile: passed
- Contract tests: 80 passed
- Next.js production build: passed
- Production route smoke test: all application and logo routes returned HTTP 200
- Production dependency audit: 0 known vulnerabilities
- Live Arc Testnet chain and USDC interface check: passed

## Requires the project owner

- Fund a dedicated test wallet through the Circle Faucet.
- Deploy AccordPay to Arc Testnet.
- Set `NEXT_PUBLIC_ACCORDPAY_ADDRESS` to the deployed address.
- Run a two-wallet end-to-end test on Arc Testnet.

## Safety

Unaudited and testnet-only. Do not use real funds or a wallet containing mainnet assets.
