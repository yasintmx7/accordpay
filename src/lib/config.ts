import { getAddress, isAddress, zeroAddress, type Address } from 'viem';

export const ARC_TESTNET_CHAIN_ID = 5_042_002;
export const ARC_TESTNET_USDC_ADDRESS = getAddress(
  '0x3600000000000000000000000000000000000000',
);

export const ARC_TESTNET_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || 'https://rpc.testnet.arc.io';
export const ARC_TESTNET_EXPLORER_URL =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL?.trim() || 'https://testnet.arcscan.app';
export const CIRCLE_FAUCET_URL = 'https://faucet.circle.com/';

function optionalAddress(value: string | undefined): Address | null {
  if (!value || !isAddress(value) || value.toLowerCase() === zeroAddress) return null;
  return getAddress(value);
}

export const ACCORDPAY_ADDRESS = optionalAddress(
  process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS,
);

export const USDC_ADDRESS =
  optionalAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS) ?? ARC_TESTNET_USDC_ADDRESS;

export const IS_ACCORDPAY_CONFIGURED = ACCORDPAY_ADDRESS !== null;
