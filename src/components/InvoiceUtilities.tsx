'use client';

import { useState, useEffect } from 'react';
import { Download, Printer, ExternalLink, Terminal, FileText } from 'lucide-react';
import { InvoiceStatus, type OnChainInvoice } from '@/lib/accordpay';
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
      doc.text(`Reference hash: ${invoice.invoiceReferenceHash.slice(0, 20)}...`, 20, y);

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
  return (
    <div className="grid gap-6">
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-zinc-800/80 dark:bg-zinc-900/20">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-zinc-100">
            <FileText size={18} className="text-slate-400 dark:text-zinc-500" />
            {isSettled ? 'Settlement Receipt' : 'Invoice Record'}
          </h2>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Off-chain PDF Receipt</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-zinc-400">
                Generate a professional PDF summary of the commercial terms permanently recorded on the Arc Testnet.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => downloadReceipt('print')}
                className="button-secondary flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => downloadReceipt('download')}
                className="button-primary flex items-center justify-center gap-2"
              >
                <Download size={16} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 dark:border-zinc-800/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Blockchain Explorer</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">View the raw smart contract transactions.</p>
              </div>

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
                    className="button-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
                  >
                    <span>View on ArcScan</span>
                    <ExternalLink size={14} />
                  </a>
                );
              })()}
            </div>
          </div>

          <div className="mt-6">
            <details className="group overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700">
              <summary className="flex cursor-pointer items-center gap-2 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Terminal size={16} className="text-slate-400 dark:text-zinc-500" />
                View technical details
              </summary>
              <div className="border-t border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500 dark:border-zinc-700 dark:bg-zinc-900 font-mono">
                <p className="mb-3 font-sans font-bold text-slate-700 dark:text-zinc-300">Raw Blockchain Identifiers</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="block text-slate-400 dark:text-zinc-500">Contract</span>
                    <span className="break-all text-slate-800 dark:text-zinc-200">{process.env.NEXT_PUBLIC_ACCORDPAY_ADDRESS}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-zinc-500">Invoice Reference Hash</span>
                    <span className="break-all text-slate-800 dark:text-zinc-200">{invoice.invoiceReferenceHash}</span>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400 dark:text-zinc-600">
            Documents are securely generated locally in your browser from current on-chain data.
          </p>
        </div>
      </section>
    </div>
  );
}
