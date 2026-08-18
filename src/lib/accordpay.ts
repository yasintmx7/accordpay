import {
  decodeEventLog,
  keccak256,
  toBytes,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { accordPayAbi } from './contracts/accordpay-abi';

export enum InvoiceStatus {
  None = 0,
  Created = 1,
  Funded = 2,
  Cancelled = 3,
  SettledEarly = 4,
  SettledAtMaturity = 5,
  Rejected = 6,
}

export function statusLabel(status: number): string {
  switch (status) {
    case InvoiceStatus.Created: return 'Created';
    case InvoiceStatus.Funded: return 'Funded';
    case InvoiceStatus.Cancelled: return 'Cancelled';
    case InvoiceStatus.SettledEarly: return 'Settled early';
    case InvoiceStatus.SettledAtMaturity: return 'Settled at maturity';
    case InvoiceStatus.Rejected: return 'Rejected';
    default: return 'Unknown';
  }
}

export interface OnChainInvoice {
  id: bigint;
  buyer: Address;
  supplier: Address;
  payoutAddress: Address;
  fullAmount: bigint;
  earlySettlementAmount: bigint;
  dueDate: bigint;
  createdAt: bigint;
  fundedAt: bigint;
  settledAt: bigint;
  invoiceReferenceHash: `0x${string}`;
  descriptionHash: `0x${string}`;
  status: number;
  dynamicEarlySettlement: boolean;
}

export interface InvoiceWriteParams {
  supplier: Address;
  fullAmount: bigint;
  earlySettlementAmount: bigint;
  dueDate: bigint;
  invoiceReferenceHash: `0x${string}`;
  descriptionHash: `0x${string}`;
  dynamicEarlySettlement?: boolean;
}

export function currentEarlySettlementAmount(invoice: OnChainInvoice, timestamp: bigint): bigint {
  if (!invoice.dynamicEarlySettlement) return invoice.earlySettlementAmount;
  if (timestamp >= invoice.dueDate) return invoice.fullAmount;
  if (invoice.fundedAt === 0n || invoice.fullAmount === invoice.earlySettlementAmount) {
    return invoice.earlySettlementAmount;
  }
  const duration = invoice.dueDate - invoice.fundedAt;
  if (duration <= 0n) return invoice.fullAmount;
  const elapsed = timestamp > invoice.fundedAt ? timestamp - invoice.fundedAt : 0n;
  const discountRange = invoice.fullAmount - invoice.earlySettlementAmount;
  return invoice.earlySettlementAmount + ((discountRange * elapsed) / duration);
}

export function hashString(value: string): `0x${string}` {
  return keccak256(toBytes(value));
}

export function formatTransactionError(error: unknown): string {
  const candidate = error as {
    shortMessage?: string;
    details?: string;
    message?: string;
    cause?: { shortMessage?: string; details?: string; message?: string };
  };
  return (
    candidate.shortMessage ||
    candidate.cause?.shortMessage ||
    candidate.details ||
    candidate.cause?.details ||
    candidate.message ||
    candidate.cause?.message ||
    'Transaction failed. Check your wallet and try again.'
  );
}

function writeArgs(params: InvoiceWriteParams) {
  return [
    params.supplier,
    params.fullAmount,
    params.earlySettlementAmount,
    params.dueDate,
    params.invoiceReferenceHash,
    params.descriptionHash,
  ] as const;
}

async function invoiceIdFromReceipt(
  publicClient: PublicClient,
  contractAddress: Address,
  hash: `0x${string}`,
): Promise<bigint> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('AccordPay transaction reverted.');

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: accordPayAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'InvoiceCreated') return decoded.args.id;
    } catch {
      // Ignore unrelated logs from the same transaction.
    }
  }
  throw new Error('InvoiceCreated event was not found in the transaction receipt.');
}

export async function getInvoice(
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
): Promise<OnChainInvoice> {
  const result = await publicClient.readContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: 'getInvoice',
    args: [invoiceId],
  });
  return result as OnChainInvoice;
}

export async function getInvoiceIdsByBuyer(
  publicClient: PublicClient,
  contractAddress: Address,
  buyer: Address,
): Promise<readonly bigint[]> {
  return publicClient.readContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: 'getInvoiceIdsByBuyer',
    args: [buyer],
  });
}

export async function getInvoiceIdsBySupplier(
  publicClient: PublicClient,
  contractAddress: Address,
  supplier: Address,
): Promise<readonly bigint[]> {
  return publicClient.readContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: 'getInvoiceIdsBySupplier',
    args: [supplier],
  });
}

export async function getInvoiceCount(
  publicClient: PublicClient,
  contractAddress: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: 'getInvoiceCount',
  });
}

export async function getSettlementToken(
  publicClient: PublicClient,
  contractAddress: Address,
): Promise<Address> {
  return publicClient.readContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: 'getSettlementToken',
  });
}

export async function createInvoice(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  params: InvoiceWriteParams,
): Promise<{ hash: `0x${string}`; invoiceId: bigint }> {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: params.dynamicEarlySettlement ? 'createDynamicInvoice' : 'createInvoice',
    args: writeArgs(params),
    chain: walletClient.chain,
    account: walletClient.account!,
  });
  const invoiceId = await invoiceIdFromReceipt(publicClient, contractAddress, hash);
  return { hash, invoiceId };
}

export async function createAndFundInvoice(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  params: InvoiceWriteParams,
): Promise<{ hash: `0x${string}`; invoiceId: bigint }> {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: params.dynamicEarlySettlement ? 'createAndFundDynamicInvoice' : 'createAndFundInvoice',
    args: writeArgs(params),
    chain: walletClient.chain,
    account: walletClient.account!,
  });
  const invoiceId = await invoiceIdFromReceipt(publicClient, contractAddress, hash);
  return { hash, invoiceId };
}

async function writeInvoiceAction(
  functionName: 'fundInvoice' | 'cancelInvoice' | 'rejectInvoice' | 'settleEarly' | 'settleAtMaturity',
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName,
    args: [invoiceId],
    chain: walletClient.chain,
    account: walletClient.account!,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('AccordPay transaction reverted.');
  return hash;
}

export function fundInvoice(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
) {
  return writeInvoiceAction('fundInvoice', walletClient, publicClient, contractAddress, invoiceId);
}

export function cancelInvoice(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
) {
  return writeInvoiceAction('cancelInvoice', walletClient, publicClient, contractAddress, invoiceId);
}

export function rejectInvoice(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
) {
  return writeInvoiceAction('rejectInvoice', walletClient, publicClient, contractAddress, invoiceId);
}

export async function updatePayoutAddress(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
  payoutAddress: Address,
) {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: accordPayAbi,
    functionName: 'updatePayoutAddress',
    args: [invoiceId, payoutAddress],
    chain: walletClient.chain,
    account: walletClient.account!,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('AccordPay transaction reverted.');
  return hash;
}

export function settleEarly(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
) {
  return writeInvoiceAction('settleEarly', walletClient, publicClient, contractAddress, invoiceId);
}

export function settleAtMaturity(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  invoiceId: bigint,
) {
  return writeInvoiceAction('settleAtMaturity', walletClient, publicClient, contractAddress, invoiceId);
}
