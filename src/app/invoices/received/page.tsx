'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { formatTransactionError, getInvoiceIdsBySupplier, getInvoice, type OnChainInvoice } from '@/lib/accordpay';
import { ACCORDPAY_ADDRESS } from '@/lib/config';
import InvoiceManager from '@/components/InvoiceManager';
import InvoiceSectionHeader from '@/components/InvoiceSectionHeader';

const CONTRACT = ACCORDPAY_ADDRESS;

export default function ReceivedInvoicesPage() {
  const { status, address, publicClient, switchToArcTestnet } = useWallet();
  const [invoices, setInvoices] = useState<OnChainInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'connected' || !address || !publicClient || !CONTRACT) return;
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      setInvoices([]);
      try {
        const ids = await getInvoiceIdsBySupplier(publicClient, CONTRACT, address);
        const fetched: OnChainInvoice[] = [];
        // Fetch in smaller chunks to avoid RPC rate limits on public testnets
        for (let i = 0; i < ids.length; i += 5) {
          const chunk = ids.slice(i, i + 5);
          const results = await Promise.all(chunk.map((id) => getInvoice(publicClient, CONTRACT, id)));
          fetched.push(...results);
          if (cancelled) break;
        }
        if (!cancelled) setInvoices(fetched.sort((a, b) => Number(b.createdAt - a.createdAt)));
      } catch (e) {
        if (!cancelled) setError(`Could not load received invoices. ${formatTransactionError(e)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [status, address, publicClient]);

  if (status === 'disconnected' || status === 'connecting' || status === 'no_wallet') {
    return <div className="max-w-7xl mx-auto px-4 py-24 text-center"><p className="text-slate-500">Connect your wallet to view received invoices.</p></div>;
  }
  if (status === 'wrong_network') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-slate-500">Switch to Arc Testnet to view invoices.</p>
        <button onClick={switchToArcTestnet} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Switch to Arc Testnet</button>
      </div>
    );
  }
  if (!CONTRACT) {
    return <div className="max-w-7xl mx-auto px-4 py-24 text-center"><p className="text-slate-500">Contract not deployed yet.</p></div>;
  }

  return (
    <div className="page-shell space-y-6 py-8">
      <InvoiceSectionHeader current="received" />
      {error && <div role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div>
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading from Arc Testnet…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No received invoices found.</div>
        ) : (
          <InvoiceManager invoices={invoices} role="supplier" />
        )}
      </div>
    </div>
  );
}
