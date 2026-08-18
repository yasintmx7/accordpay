import type { Address } from 'viem';

/** Shortens a hex address to 0x1234...abcd format. */
export function shortAddress(address: Address, leading = 6, trailing = 4): string {
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`;
}

/** Returns true when the string looks like a valid EVM address. */
export function isValidAddress(value: string): value is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/** Formats a USDC amount (6-decimal bigint) to a human-readable string. */
export function formatUsdc(raw: bigint, decimals = 6): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  if (fraction === 0n) return whole.toLocaleString();
  const padded = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toLocaleString()}.${padded}`;
}

/** Converts a human USDC string ("12.50") to a 6-decimal bigint. */
export function parseUsdc(value: string, decimals = 6): bigint {
  const [whole = '0', frac = ''] = value.replace(/,/g, '').split('.');
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded);
}
