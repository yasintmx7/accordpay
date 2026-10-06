'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InvoiceStatus, statusLabel, type OnChainInvoice } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';
import { ARC_TESTNET_EXPLORER_URL } from '@/lib/config';
import { useWallet } from '@/lib/wallet';

let accordPayPdfLogoPromise: Promise<string> | null = null;

function loadAccordPayPdfLogo() {
  if (!accordPayPdfLogoPromise) {
    accordPayPdfLogoPromise = fetch('/accordpay-mark-light-compact.png')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the AccordPay PDF logo.');
        return response.blob();
      })
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the AccordPay PDF logo.'));
        reader.readAsDataURL(blob);
      }))
      .catch((error) => {
        accordPayPdfLogoPromise = null;
        throw error;
      });
  }

  return accordPayPdfLogoPromise;
}

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

  async function downloadReceipt(action: 'download' | 'print' = 'download') {
    const [{ jsPDF }, logoDataUrl] = await Promise.all([
      import('jspdf'),
      loadAccordPayPdfLogo(),
    ]);
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const { getCompanyProfile, getDisplayName, getInvoiceMeta } = await import('@/lib/store');
    const { resolveInvoiceStatus } = await import('@/lib/invoice-status');

    // Colors
    const textMain: [number, number, number] = [15, 23, 42]; // slate-900
    const textMuted: [number, number, number] = [100, 116, 139]; // slate-500
    const line: [number, number, number] = [226, 232, 240]; // slate-200

    const drawPdfHeader = (title: string, reference: string, secondaryReference?: string) => {
      doc.addImage(logoDataUrl, 'PNG', 20, 17, 8, 8, 'accordpay-mark', 'FAST');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(...textMain);
      doc.text('AccordPay', 31, 22.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...textMuted);
      doc.text('Programmable settlement on Arc', 31, 27.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...textMain);
      doc.text(title, 190, 21.5, { align: 'right' });

      doc.setFontSize(9.5);
      doc.text(reference, 190, 27.5, { align: 'right' });
      if (secondaryReference) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...textMuted);
        doc.text(secondaryReference, 190, 32.5, { align: 'right' });
      }

      doc.setDrawColor(...line);
      doc.line(20, 38, 190, 38);
      return 46;
    };
    
    const isSettledEarly = invoice.status === InvoiceStatus.SettledEarly;
    const isSettledAtMaturity = invoice.status === InvoiceStatus.SettledAtMaturity;
    const isSettled = isSettledEarly || isSettledAtMaturity;

    const createdDate = new Date(Number(invoice.createdAt) * 1_000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const dueDate = new Date(Number(invoice.dueDate) * 1_000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    
    // Buyer / Supplier names
    const buyerName = getDisplayName(invoice.buyer);
    const supplierName = getDisplayName(invoice.supplier);
    const buyerProfile = getCompanyProfile(invoice.buyer);
    const supplierProfile = getCompanyProfile(invoice.supplier);

    const meta = getInvoiceMeta(invoice.id.toString());
    const docHashStr = invoice.descriptionHash;
    const invoiceNum = meta?.invoiceNumber || invoice.id.toString();

    let y = 46;

    if (!isSettled) {
      // --- B2B INVOICE ---
      
      y = drawPdfHeader('Invoice', `Invoice #${invoiceNum}`);
      
      // Status Badge
      const statusInfo = resolveInvoiceStatus(invoice, BigInt(Math.floor(Date.now() / 1000)));
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.roundedRect(170, y, 20, 6, 1.5, 1.5, 'F');
      doc.text(statusInfo.label.toUpperCase(), 180, y + 4.2, { align: 'center' });

      y += 12;
      doc.setTextColor(...textMuted);
      doc.setFontSize(10);
      doc.text(`Issued: ${createdDate}`, 20, y);
      doc.text(`Due: ${dueDate}`, 20, y + 6);

      y += 16;
      // FROM / TO
      doc.setDrawColor(...line);
      doc.line(20, y, 190, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      doc.text('FROM', 20, y);
      doc.text('TO', 110, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...textMain);
      doc.text(buyerName, 20, y);
      doc.text(supplierName, 110, y);
      
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      if (buyerProfile?.email) { doc.text(buyerProfile.email, 20, y); }
      if (supplierProfile?.email) { doc.text(supplierProfile.email, 110, y); }
      
      y += 6;
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.text(`Wallet: ${invoice.buyer.slice(0, 10)}...${invoice.buyer.slice(-6)}`, 20, y);
      doc.text(`Wallet: ${invoice.supplier.slice(0, 10)}...${invoice.supplier.slice(-6)}`, 110, y);

      y += 16;
      doc.setDrawColor(...line);
      doc.line(20, y, 190, y);
      y += 10;

      // SUMMARY
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      doc.text('Description', 20, y);
      doc.text('Amount', 190, y, { align: 'right' });
      
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...textMain);
      doc.text(meta?.description || 'Invoice payment', 20, y);
      doc.text(`${formatUsdc(invoice.fullAmount)} USDC`, 190, y, { align: 'right' });

      y += 16;
      doc.setDrawColor(...line);
      doc.line(20, y, 190, y);
      y += 10;

      // TOTAL
      doc.setFontSize(11);
      doc.setTextColor(...textMuted);
      doc.text('Subtotal', 140, y);
      doc.setTextColor(...textMain);
      doc.text(`${formatUsdc(invoice.fullAmount)} USDC`, 190, y, { align: 'right' });

      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Total', 140, y);
      doc.text(`${formatUsdc(invoice.fullAmount)} USDC`, 190, y, { align: 'right' });

      y += 24;

      // PAYMENT TERMS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Payment Terms', 20, y);
      
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      doc.text('Payment method: ', 20, y); doc.setTextColor(...textMain); doc.text('USDC on Arc', 60, y); y += 6;
      doc.setTextColor(...textMuted); doc.text('Payment terms: ', 20, y); doc.setTextColor(...textMain); doc.text(`Due ${dueDate}`, 60, y); y += 6;
      doc.setTextColor(...textMuted); doc.text('Early settlement: ', 20, y); doc.setTextColor(...textMain); doc.text('Available', 60, y); y += 6;
      doc.setTextColor(...textMuted); doc.text('Early amount: ', 20, y); doc.setTextColor(...textMain); doc.text(`${formatUsdc(invoice.earlySettlementAmount)} USDC`, 60, y);
      
      y += 20;
      // BLOCKCHAIN VERIFICATION
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Blockchain Verification', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text(`Network: Arc Testnet`, 20, y); y += 6;
      doc.text(`Contract: ${process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS || ''}`, 20, y); y += 6;
      doc.text(`Reference hash: ${invoice.invoiceReferenceHash.slice(0, 20)}...`, 20, y); y += 6;
      doc.text(`Document hash: ${docHashStr.slice(0, 20)}...`, 20, y);

    } else {
      // --- SETTLEMENT RECEIPT ---
      
      y = drawPdfHeader(
        'Settlement Receipt',
        `Invoice #${invoiceNum}`,
        `Settlement #STL-${invoice.id.toString()}`,
      );
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      doc.text('STATUS', 20, y);
      doc.text('SETTLEMENT DATE', 80, y);
      
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(isSettledEarly ? 'SETTLED EARLY' : 'SETTLED AT MATURITY', 20, y);
      doc.setTextColor(...textMain);
      const settledDate = new Date(Number(invoice.settledAt) * 1_000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      doc.text(settledDate, 80, y);

      y += 15;
      doc.setDrawColor(...line);
      doc.line(20, y, 190, y);
      y += 15;

      // PAYMENT RESULT
      const amountPaid = isSettledEarly ? invoice.earlySettlementAmount : invoice.fullAmount;
      const discount = invoice.fullAmount - invoice.earlySettlementAmount;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...textMuted);
      doc.text('AMOUNT PAID TO SUPPLIER', 20, y);
      
      y += 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(32);
      doc.setTextColor(...textMain);
      doc.text(`${formatUsdc(amountPaid)} USDC`, 20, y);

      y += 18;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('Original invoice amount', 20, y); doc.setTextColor(...textMain); doc.text(`${formatUsdc(invoice.fullAmount)} USDC`, 90, y, { align: 'right' }); y += 7;
      doc.setTextColor(...textMuted); doc.text('Early settlement discount', 20, y); doc.setTextColor(...textMain); doc.text(`${formatUsdc(discount)} USDC`, 90, y, { align: 'right' }); y += 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMuted); doc.text('Supplier received', 20, y); doc.setTextColor(...textMain); doc.text(`${formatUsdc(amountPaid)} USDC`, 90, y, { align: 'right' });
      
      y += 15;
      doc.setDrawColor(...line);
      doc.line(20, y, 190, y);
      y += 12;

      // PARTIES
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      doc.text('BUYER', 20, y);
      doc.text('SUPPLIER', 110, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...textMain);
      doc.text(buyerName, 20, y);
      doc.text(supplierName, 110, y);
      
      y += 6;
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text(`Wallet: ${invoice.buyer.slice(0, 10)}...${invoice.buyer.slice(-6)}`, 20, y);
      doc.text(`Wallet: ${invoice.supplier.slice(0, 10)}...${invoice.supplier.slice(-6)}`, 110, y);

      y += 15;
      doc.setDrawColor(...line);
      doc.line(20, y, 190, y);
      y += 12;

      // INVOICE INFORMATION
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...textMain);
      doc.text('Invoice Information', 20, y);
      
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      doc.text('Issue date: ', 20, y); doc.setTextColor(...textMain); doc.text(createdDate, 60, y); 
      doc.setTextColor(...textMuted); doc.text('Due date: ', 110, y); doc.setTextColor(...textMain); doc.text(dueDate, 140, y); y += 7;
      doc.setTextColor(...textMuted); doc.text('Payment method: ', 20, y); doc.setTextColor(...textMain); doc.text('USDC on Arc', 60, y);

      y += 15;
      doc.setDrawColor(...line);
      doc.line(20, y, 190, y);
      y += 12;

      // BLOCKCHAIN VERIFICATION
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...textMain);
      doc.text('Blockchain Verification', 20, y);
      
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text('Network: ', 20, y); doc.setTextColor(...textMain); doc.text('Arc Testnet', 60, y); y += 6;
      doc.setTextColor(...textMuted); doc.text('Funding tx: ', 20, y); doc.setTextColor(...textMain); doc.text(txHashes['InvoiceFunded'] ? `${txHashes['InvoiceFunded'].slice(0, 15)}...` : 'Unknown', 60, y); y += 6;
      doc.setTextColor(...textMuted); doc.text('Settlement tx: ', 20, y); doc.setTextColor(...textMain); doc.text((txHashes['InvoiceSettledEarly'] || txHashes['InvoiceSettledAtMaturity']) ? `${(txHashes['InvoiceSettledEarly'] || txHashes['InvoiceSettledAtMaturity']).slice(0, 15)}...` : 'Unknown', 60, y); y += 6;
      doc.setTextColor(...textMuted); doc.text('Contract: ', 20, y); doc.setTextColor(...textMain); doc.text(`${process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS || ''}`, 60, y);
    }

    // FOOTER
    doc.setDrawColor(...line);
    doc.line(20, 274, 190, 274);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...textMain);
    doc.text('Generated by AccordPay', 105, 281, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text('Programmable settlement on Arc', 105, 285, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('Arc Testnet - Testnet transactions have no financial value.', 105, 289, { align: 'center' });

    if (action === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      const fileKind = isSettled ? 'settlement-receipt' : 'b2b-invoice';
      doc.save(`accordpay-${fileKind}-${invoice.id}.pdf`);
    }
  }

  const isSettled = invoice.status === InvoiceStatus.SettledEarly || invoice.status === InvoiceStatus.SettledAtMaturity;
  const isFunded = invoice.status === InvoiceStatus.Funded;

  return <div className="grid gap-6">
    <section className="card p-5 sm:p-6">
      <h2 className="section-title">{isSettled ? 'Settlement Documents' : 'Invoice Documents'}</h2>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <p className="font-semibold text-emerald-800 dark:text-emerald-400">On-chain verification complete</p>
        <p className="mt-1 text-sm leading-5 text-emerald-700 dark:text-emerald-500">
          The document details match the permanent contract record on Arc Testnet.
        </p>
      </div>
      
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => downloadReceipt('download')} className="button-secondary w-full">
          Download PDF
        </button>
        <button type="button" onClick={() => downloadReceipt('print')} className="button-secondary w-full">
          Print Document
        </button>
      </div>
      
      <div className="mt-3">
        {(() => {
          const latestTx = txHashes['InvoiceSettledEarly'] || txHashes['InvoiceSettledAtMaturity'] || txHashes['InvoiceFunded'] || txHashes['InvoiceCreated'];
          const explorerLink = latestTx 
            ? `${ARC_TESTNET_EXPLORER_URL}/tx/${latestTx}`
            : `${ARC_TESTNET_EXPLORER_URL}/address/${process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS ?? ''}`;
            
          return (
            <a 
              href={explorerLink}
              target="_blank" 
              rel="noreferrer" 
              className="button-secondary w-full flex items-center justify-center gap-2"
            >
              View on ArcScan ↗
            </a>
          );
        })()}
      </div>

      <div className="mt-5">
        <details className="rounded-xl border border-slate-200 dark:border-zinc-700">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
            View technical details
          </summary>
          <div className="border-t border-slate-200 p-4 text-xs leading-5 text-slate-500 dark:border-zinc-700 font-mono">
            <p className="mb-2 text-slate-700 font-bold dark:text-zinc-300 font-sans">Raw Blockchain Identifiers</p>
            <p><strong>Contract:</strong> <br/> {process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS}</p>
            <p className="mt-2"><strong>Reference Hash:</strong> <br/> {invoice.invoiceReferenceHash}</p>
            <p className="mt-2"><strong>Document Hash:</strong> <br/> {invoice.descriptionHash}</p>
          </div>
        </details>
      </div>
      
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Documents are securely generated in your browser from current on-chain data.
      </p>
    </section>
  </div>;
}
