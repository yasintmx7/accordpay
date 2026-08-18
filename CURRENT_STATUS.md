# Current Status

AccordPay is source-complete and deployment-ready for Arc Testnet.

- Frontend: live wallet and Viem integration implemented.
- Contract: full create, atomic create/fund, fund, cancel, early-settlement, and maturity-settlement lifecycle implemented.
- Token: official Arc Testnet USDC ERC-20 interface, 6 decimals.
- Tests: all 80 Hardhat contract tests pass.
- Deployment: Ignition module and official Arc Testnet parameters included.
- Verification: lint, types, Solidity compile, production build, and live Arc network/USDC checks pass.
- Remaining external step: deploy with the owner's funded test wallet and place the resulting address in `.env`.

No mainnet deployment is supported. Arc mainnet placeholders were removed rather than presenting unverified values.
