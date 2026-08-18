import 'dotenv/config';
import { createPublicClient, getAddress, http } from 'viem';
import { arcTestnet } from '../src/lib/arc';
import { accordPayAbi } from '../src/lib/contracts/accordpay-abi';
import { erc20Abi } from '../src/lib/contracts/erc20-abi';
import {
  ACCORDPAY_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_USDC_ADDRESS,
} from '../src/lib/config';

async function main() {
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });

  const chainId = await client.getChainId();
  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(`RPC returned chain ${chainId}; expected ${ARC_TESTNET_CHAIN_ID}.`);
  }

  const usdcCode = await client.getCode({ address: ARC_TESTNET_USDC_ADDRESS });
  if (!usdcCode || usdcCode === '0x') throw new Error('Arc Testnet USDC interface has no code.');

  const decimals = await client.readContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals',
  });
  if (decimals !== 6) throw new Error(`USDC returned ${decimals} decimals; expected 6.`);

  console.log(`Arc Testnet connected (chain ${chainId}).`);
  console.log(`USDC interface verified at ${ARC_TESTNET_USDC_ADDRESS} with ${decimals} decimals.`);

  if (!ACCORDPAY_ADDRESS) {
    console.log('NEXT_PUBLIC_ACCORDPAY_ADDRESS is unset; network checks are complete.');
    return;
  }

  const contractCode = await client.getCode({ address: ACCORDPAY_ADDRESS });
  if (!contractCode || contractCode === '0x') {
    throw new Error(`No AccordPay contract exists at ${ACCORDPAY_ADDRESS}.`);
  }
  const settlementToken = await client.readContract({
    address: ACCORDPAY_ADDRESS,
    abi: accordPayAbi,
    functionName: 'getSettlementToken',
  });
  if (getAddress(settlementToken) !== ARC_TESTNET_USDC_ADDRESS) {
    throw new Error(`AccordPay uses ${settlementToken}, not the official Arc Testnet USDC interface.`);
  }
  console.log(`AccordPay deployment verified at ${ACCORDPAY_ADDRESS}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
