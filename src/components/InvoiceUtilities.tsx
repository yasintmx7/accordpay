'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InvoiceStatus, statusLabel, type OnChainInvoice } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';
import { ARC_TESTNET_EXPLORER_URL } from '@/lib/config';
import { useWallet } from '@/lib/wallet';

export default function InvoiceUtilities({ invoice }: { invoice: OnChainInvoice }) {
  const { publicClient } = useWallet();
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!publicClient || !process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS) return;
    const fetchHash = async () => {
      try {
        const { pad, toHex, decodeEventLog } = await import('viem');
        const { accordPayAbi } = await import('@/lib/contracts/accordpay-abi');
        
        const latest = await publicClient.getBlockNumber();
        const hashes: Record<string, string> = {};
        
        let foundCreated = false;
        // Search backwards in 10,000-block chunks to respect Arc RPC limits
        for (let i = 0n; i < 200n; i++) {
          const to = latest - (i * 10000n);
          const from = to - 9999n > 0n ? to - 9999n : 0n;
          
          try {
            const logs = await publicClient.getLogs({
              address: process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS as `0x${string}`,
              // @ts-expect-error viem getLogs topics typing requires strict ABI matching
              topics: [
                null, 
                pad(toHex(invoice.id), { size: 32 })
              ] as [null, `0x${string}`],
              fromBlock: from,
              toBlock: to,
            });
            
            for (const log of logs) {
              try {
                const decoded = decodeEventLog({ abi: accordPayAbi, data: log.data, topics: log.topics });
                if (log.transactionHash) hashes[decoded.eventName] = log.transactionHash;
                if (decoded.eventName === 'InvoiceCreated') foundCreated = true;
              } catch {}
            }
          } catch {
             // If a chunk fails, ignore and continue
          }
          
          if (foundCreated || from === 0n) break;
        }
        
        setTxHashes({ ...hashes });
      } catch (e) {
        console.error('Failed to fetch tx hashes:', e);
      }
    };
    void fetchHash();
  }, [publicClient, invoice.id]);

  const timeline = [
    { label: 'Invoice created', description: 'Payment terms agreed', date: invoice.createdAt, txHash: txHashes['InvoiceCreated'] },
    { label: 'Payment secured', description: 'Funds protected in escrow', date: invoice.fundedAt, txHash: txHashes['InvoiceFunded'] },
    { label: 'Supplier paid', description: invoice.status === InvoiceStatus.SettledEarly ? 'Early payment completed' : 'Full payment completed', date: invoice.settledAt, txHash: txHashes['InvoiceSettledEarly'] || txHashes['InvoiceSettledAtMaturity'] },
  ];

  async function downloadReceipt() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const brand: [number, number, number] = [49, 87, 246];
    const ink: [number, number, number] = [15, 23, 42];
    const muted: [number, number, number] = [100, 116, 139];
    const line: [number, number, number] = [226, 232, 240];
    const surface: [number, number, number] = [248, 250, 252];
    const success: [number, number, number] = [5, 150, 105];
    const warning: [number, number, number] = [217, 119, 6];
    const danger: [number, number, number] = [220, 38, 38];

    const isSettledEarly = invoice.status === InvoiceStatus.SettledEarly;
    const isSettledAtMaturity = invoice.status === InvoiceStatus.SettledAtMaturity;
    const isSettled = isSettledEarly || isSettledAtMaturity;
    const isFunded = invoice.status === InvoiceStatus.Funded;
    const isCancelled = invoice.status === InvoiceStatus.Cancelled;
    const isRejected = invoice.status === InvoiceStatus.Rejected;
    const documentTitle = isSettled
      ? 'SETTLEMENT RECEIPT'
      : isFunded
        ? 'PAYMENT SECURED CERTIFICATE'
        : isCancelled || isRejected
          ? isRejected ? 'REJECTION & REFUND RECORD' : 'CANCELLATION RECORD'
          : 'INVOICE RECORD';
    const documentSubtitle = isSettled
      ? 'Proof of completed supplier payment'
      : isFunded
        ? 'Funds are secured in the AccordPay escrow contract'
        : isCancelled || isRejected
          ? isRejected ? 'Supplier rejection and escrow refund record' : 'Record of a cancelled invoice'
          : 'Record of invoice terms before payment is secured';
    const statusColor = isSettled ? success : isFunded ? brand : isCancelled || isRejected ? danger : warning;
    const createdDate = new Date(Number(invoice.createdAt) * 1_000);
    const dueDate = new Date(Number(invoice.dueDate) * 1_000);

    doc.setProperties({
      title: `${documentTitle} - AccordPay Invoice #${invoice.id.toString()}`,
      subject: documentSubtitle,
      author: 'AccordPay',
      creator: 'AccordPay Document Generator v2',
    });

    doc.setFillColor(...ink);
    doc.rect(0, 0, 210, 7, 'F');

    const img = new Image();
    img.src = '/accordpay-logo.png';
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    if (img.width > 0) {
      const ratio = img.width / img.height;
      const h = 9;
      const w = h * ratio;
      doc.addImage(img, 'PNG', 18, 18, w, h);
      if (ratio < 1.5) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(...ink);
        doc.text('AccordPay', 18 + w + 3, 26);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...ink);
      doc.text('AccordPay', 18, 26);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...ink);
    doc.text(documentTitle, 192, 22, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`Document AP-${invoice.id.toString().padStart(6, '0')}`, 192, 28, { align: 'right' });

    doc.setDrawColor(...line);
    doc.line(18, 38, 192, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...ink);
    doc.text(`Invoice #${invoice.id.toString()}`, 18, 51);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(documentSubtitle, 18, 58);

    doc.setFillColor(...statusColor);
    doc.roundedRect(154, 44, 38, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabel(invoice.status).toUpperCase(), 173, 51, { align: 'center' });

    doc.setFillColor(...surface);
    doc.roundedRect(18, 69, 174, 33, 3, 3, 'F');
    const summary = [
      ['INVOICE VALUE', `${formatUsdc(invoice.fullAmount)} USDC`],
      ['CREATED', createdDate.toLocaleDateString()],
      ['DUE', dueDate.toLocaleDateString()],
    ];
    summary.forEach(([label, value], index) => {
      const x = 25 + index * 56;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(label, x, 80);
      doc.setFontSize(index === 0 ? 13 : 10);
      doc.setTextColor(...ink);
      doc.text(value, x, 91);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ink);
    doc.text('BUYER', 18, 116);
    doc.text('SUPPLIER', 108, 116);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(doc.splitTextToSize(invoice.buyer, 78), 18, 123);
    doc.text(doc.splitTextToSize(invoice.supplier, 78), 108, 123);
    if (invoice.payoutAddress.toLowerCase() !== invoice.supplier.toLowerCase()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Payout: ${invoice.payoutAddress}`, 108, 136);
    }

    doc.setDrawColor(...line);
    doc.line(18, 141, 192, 141);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text('Payment terms', 18, 153);
    doc.setFontSize(9);
    doc.text('Full invoice amount', 18, 166);
    doc.text(invoice.dynamicEarlySettlement ? 'Starting early payment' : 'Fixed early payment', 18, 176);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatUsdc(invoice.fullAmount)} USDC`, 192, 166, { align: 'right' });
    doc.text(`${formatUsdc(invoice.earlySettlementAmount)} USDC`, 192, 176, { align: 'right' });

    if (isSettled) {
      const amountPaid = isSettledEarly ? invoice.earlySettlementAmount : invoice.fullAmount;
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(18, 187, 174, 27, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...success);
      doc.text('AMOUNT PAID TO SUPPLIER', 25, 197);
      doc.setFontSize(16);
      doc.text(`${formatUsdc(amountPaid)} USDC`, 25, 208);
      doc.setFontSize(8);
      doc.text(isSettledEarly ? `Early payment savings: ${formatUsdc(invoice.fullAmount - invoice.earlySettlementAmount)} USDC` : 'Paid in full at maturity', 185, 204, { align: 'right' });
    } else if (isFunded) {
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(18, 187, 174, 27, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...brand);
      doc.text('AMOUNT SECURED IN ESCROW', 25, 197);
      doc.setFontSize(16);
      doc.text(`${formatUsdc(invoice.fullAmount)} USDC`, 25, 208);
      doc.setFontSize(8);
      doc.text('Not yet paid to supplier', 185, 204, { align: 'right' });
    } else {
      doc.setFillColor(...surface);
      doc.roundedRect(18, 187, 174, 27, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...statusColor);
      doc.text(isRejected ? 'PAYMENT RETURNED TO BUYER' : isCancelled ? 'NO PAYMENT WAS MADE' : 'PAYMENT HAS NOT BEEN SECURED', 25, 203);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text('On-chain verification', 18, 230);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    const contract = process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS ?? 'Not configured';
    doc.text('NETWORK', 18, 240);
    doc.text('Arc Testnet', 48, 240);
    doc.text('CONTRACT', 18, 248);
    doc.setFont('courier', 'normal');
    doc.text(contract, 48, 248);
    doc.setFont('helvetica', 'normal');
    doc.text('REFERENCE HASH', 18, 256);
    doc.setFont('courier', 'normal');
    doc.text(invoice.invoiceReferenceHash, 48, 256);
    if (invoice.settledAt > 0n) {
      doc.setFont('helvetica', 'normal');
      doc.text('SETTLED', 18, 264);
      doc.text(new Date(Number(invoice.settledAt) * 1_000).toLocaleString(), 48, 264);
    } else if (invoice.fundedAt > 0n) {
      doc.setFont('helvetica', 'normal');
      doc.text('SECURED', 18, 264);
      doc.text(new Date(Number(invoice.fundedAt) * 1_000).toLocaleString(), 48, 264);
    }

    doc.setDrawColor(...line);
    doc.line(18, 275, 192, 275);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text('Generated from the current AccordPay on-chain record.', 18, 282);
    doc.text('ARC TESTNET ONLY - TESTNET USDC HAS NO FINANCIAL VALUE', 192, 282, { align: 'right' });
    doc.text('AccordPay is unaudited. Verify all details against the contract record before relying on this document.', 105, 288, { align: 'center' });

    const fileKind = isSettled ? 'settlement-receipt' : isFunded ? 'payment-secured' : isRejected ? 'rejection-refund-record' : isCancelled ? 'cancellation-record' : 'invoice-record';
    const filename = `accordpay-v2-${fileKind}-${invoice.id}.pdf`;
    doc.save(filename);
  }

  const downloadLabel = invoice.status === InvoiceStatus.SettledEarly || invoice.status === InvoiceStatus.SettledAtMaturity
    ? 'Download settlement receipt'
    : invoice.status === InvoiceStatus.Funded
      ? 'Download payment certificate'
      : invoice.status === InvoiceStatus.Rejected
        ? 'Download rejection and refund record'
        : invoice.status === InvoiceStatus.Cancelled
          ? 'Download cancellation record'
        : 'Download invoice record';

  return <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
    <section className="card p-5 sm:p-6"><h2 className="section-title">Payment progress</h2><ol className="space-y-5">{timeline.map((item, index) => {
      const complete = item.date > 0n;
      return <li key={`${item.label}-${index}`} className="relative flex gap-4"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-700 dark:text-zinc-500'}`}>{complete ? '✓' : index + 1}</div><div><p className={`font-semibold ${complete ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}`}>{item.label}</p><p className="mt-0.5 text-xs text-slate-500">{item.description} {complete ? `· ${new Date(Number(item.date) * 1_000).toLocaleString()}` : '· Pending'}</p>{item.txHash && <a href={`${ARC_TESTNET_EXPLORER_URL}/tx/${item.txHash}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">View payment proof ↗</a>}</div></li>;
    })}</ol></section>
    <section className="card p-5 sm:p-6"><h2 className="section-title">Documents and proof</h2><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30"><p className="font-semibold text-emerald-800 dark:text-emerald-400">Invoice record verified</p><p className="mt-1 text-sm leading-5 text-emerald-700 dark:text-emerald-500">The invoice details match the permanent record on Arc Testnet.</p></div><div className="mt-4 space-y-3"><button type="button" onClick={downloadReceipt} className="button-secondary w-full">{downloadLabel}</button>{invoice.status === InvoiceStatus.Created && <Link href={`/bridge?invoice=${invoice.id}`} className="button-primary w-full">Fund from another chain</Link>}<Link href="/payouts" className="button-secondary w-full">Payment preferences</Link><details className="rounded-xl border border-slate-200 dark:border-zinc-700"><summary className="cursor-pointer px-4 py-3 text-center text-sm font-semibold text-slate-600 dark:text-zinc-300">View technical verification</summary><div className="border-t border-slate-200 p-4 text-xs leading-5 text-slate-500 dark:border-zinc-700"><p>Contract-backed record on Arc Testnet.</p><a className="mt-2 inline-block font-semibold text-indigo-600 hover:underline dark:text-indigo-400" target="_blank" rel="noreferrer" href={`${ARC_TESTNET_EXPLORER_URL}/address/${process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS ?? ''}`}>Open contract record ↗</a></div></details></div><p className="mt-4 text-xs leading-5 text-slate-500">Documents are generated from the current on-chain record.</p></section>
  </div>;
}
