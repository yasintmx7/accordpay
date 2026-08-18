# Project Audit

## Findings corrected

- Replaced stale demo-only documentation with the actual onchain architecture.
- Added an atomic create-and-fund contract action matching the frontend label.
- Centralized and validated all public contract/network addresses.
- Removed unverified Arc mainnet placeholders.
- Replaced brittle first-log invoice ID extraction with ABI event decoding.
- Added receipt-status checks for every write.
- Fixed wallet account/chain synchronization and listener cleanup.
- Updated the Next.js dynamic route to the asynchronous `params` API.
- Added exact approval, input validation, error states, responsive tables, and production response headers.
- Replaced the placeholder letter mark with the approved AccordPay logo in the header, homepage, favicon, and app icon.
- Replaced phone-sized data tables with responsive invoice cards while retaining full desktop tables.
- Prevented addresses, hashes, transaction errors, and page actions from overflowing narrow layouts.
- Added compact copy controls for wallet addresses and invoice hashes.
- Added contextual waiting/completion messages so the invoice action panel is never blank.
- Distinguished RPC/read failures from nonexistent invoices and added a retry path.
- Prevented stale invoice requests from replacing data after a wallet or route change.
- Improved wallet-picker accessibility, outside-click behavior, narrow-screen sizing, and connection-error visibility.
- Added deployment, live Arc verification, and security documentation.
- Excluded generated dependencies, build output, deployments, and Git internals from the deliverable ZIP.

## External validation still required

Local EVM tests cannot simulate Arc's protocol-level native-USDC behavior. Before demonstrating the project, deploy on Arc Testnet and complete one full two-wallet invoice lifecycle.
