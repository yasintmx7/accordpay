'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';

export default function PaymentLinkButton({ invoiceId }: { invoiceId: bigint }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/pay/${invoiceId.toString()}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <button type="button" onClick={() => void copy()} className="button-primary w-full sm:w-auto"><Copy size={16}/>{copied ? 'Supplier link copied' : 'Copy supplier payment link'}</button>;
}
