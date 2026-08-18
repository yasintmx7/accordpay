# Security Notes

AccordPay is unaudited and intended only for Arc Testnet demonstrations.

## Contract protections

- Immutable settlement-token address set at deployment
- OpenZeppelin `SafeERC20` for USDC movements
- Reentrancy protection on every token-moving entry point
- Checks-effects-interactions ordering
- Exact incoming-balance verification during funding
- Buyer-only funding and cancellation
- Supplier-only settlement
- Explicit lifecycle and maturity validation
- No owner, admin withdrawal, upgrade, fee, or arbitrary-call capability

## Frontend protections

- No private keys, API secrets, or custodial wallets
- EIP-6963 wallet discovery with a legacy injected-wallet fallback
- Exact approvals instead of unlimited approvals
- Contract and token addresses validated before use
- Receipts checked for success and `InvoiceCreated` decoded from the AccordPay log
- Public environment variables contain only public network configuration
- Frame, MIME-sniffing, referrer, and browser-permission response headers

## Important limitations

- The contracts have not received a professional audit.
- Local Hardhat tests use a standard EVM and cannot reproduce Arc-specific native-USDC behavior, system transfer events, or blocklist enforcement. Run `npm run arc:check` and perform a full Arc Testnet lifecycle before a demo.
- Invoice references and descriptions are stored only as hashes. Users must preserve the original offchain values if they need later proof.
- Settlement requires a supplier transaction; it is not an offchain scheduler.
- Arc Testnet may be reset or temporarily unavailable.
- Never reuse a mainnet wallet or private key for this project.
