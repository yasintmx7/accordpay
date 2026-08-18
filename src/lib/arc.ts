import { defineChain } from 'viem';
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
  ARC_TESTNET_RPC_URL,
} from './config';

/**
 * Arc Testnet network values from the official Arc connection reference.
 * Native USDC uses 18 decimals for gas; application-level ERC-20 USDC uses 6.
 */
export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: [
        ARC_TESTNET_RPC_URL,
        'https://rpc.blockdaemon.testnet.arc.io',
        'https://rpc.drpc.testnet.arc.io',
        'https://rpc.quicknode.testnet.arc.io',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: ARC_TESTNET_EXPLORER_URL,
      apiUrl: `${ARC_TESTNET_EXPLORER_URL}/api`,
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 0,
    },
  },
  testnet: true,
});

export const supportedChains = [arcTestnet] as const;

export function getExplorerUrl(
  chainId: number,
  type: 'tx' | 'address',
  hash: string,
): string {
  if (chainId !== arcTestnet.id) return arcTestnet.blockExplorers.default.url;
  return `${arcTestnet.blockExplorers.default.url}/${type}/${hash}`;
}
