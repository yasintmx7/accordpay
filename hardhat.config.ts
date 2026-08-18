import type { HardhatUserConfig } from "hardhat/config";
import * as toolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { createRequire } from "node:module";
import "dotenv/config";

const require = createRequire(import.meta.url);
const solcPath = require.resolve("solc/soljson.js");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    path: solcPath,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  plugins: [toolboxViem.default],
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    arcTestnet: {
      type: "http",
      chainId: 5_042_002,
      url: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io",
      accounts: process.env.ARC_TESTNET_DEPLOYER_PRIVATE_KEY ? [process.env.ARC_TESTNET_DEPLOYER_PRIVATE_KEY] : [],
    }
  }
};

export default config;
