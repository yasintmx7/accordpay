# Official References

Checked on 2026-08-04. Only first-party Arc and Circle documentation is used for network-specific values.

## Arc

- [Connect to Arc](https://docs.arc.network/arc/references/connect-to-arc) — chain ID `5042002`, public RPC endpoints, Arcscan, wallet setup, and Circle Faucet.
- [Contract addresses](https://docs.arc.network/arc/references/contract-addresses) — official Arc Testnet USDC ERC-20 interface `0x3600000000000000000000000000000000000000` and 6-decimal application behavior.
- [Stablecoin native model](https://docs.arc.network/arc/concepts/stablecoin-native-model) — one USDC balance exposed through the 18-decimal native and 6-decimal ERC-20 interfaces.
- [EVM differences](https://docs.arc.network/arc/references/evm-differences) — Arc-specific value-transfer rules, block behavior, and limitations of local EVM simulation.
- [Deploy on Arc](https://docs.arc.network/arc/tutorials/deploy-on-arc) — testnet deployment prerequisites and USDC gas funding.

## Circle

- [USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses) — independent confirmation of the Arc Testnet USDC address.
- [Circle Faucet](https://faucet.circle.com/) — Arc Testnet USDC for deployment and application testing.
- [Transfer USDC from Ethereum to Arc](https://developers.circle.com/cctp/quickstarts/transfer-usdc-ethereum-to-arc) — optional future CCTP funding path; intentionally outside the core escrow MVP.

## Scope decision

AccordPay integrates Circle-issued testnet USDC through Arc's official ERC-20 interface. Circle API keys, custodial wallets, Gateway, CCTP, Bridge Kit, StableFX, and unrelated App Kit features are not required for the core invoice-settlement lifecycle and are not silently bundled into this project.
