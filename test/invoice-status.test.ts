import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InvoiceStatus, type OnChainInvoice } from '../src/lib/accordpay';
import { resolveInvoiceStatus } from '../src/lib/invoice-status';

const NOW = 2_000n;

function invoice(overrides: Partial<OnChainInvoice> = {}): OnChainInvoice {
  return {
    id: 1n,
    buyer: '0x0000000000000000000000000000000000000001',
    supplier: '0x0000000000000000000000000000000000000002',
    payoutAddress: '0x0000000000000000000000000000000000000002',
    fullAmount: 1_000_000n,
    earlySettlementAmount: 900_000n,
    dueDate: 3_000n,
    createdAt: 1_000n,
    fundedAt: 1_500n,
    settledAt: 0n,
    invoiceReferenceHash: `0x${'01'.repeat(32)}`,
    descriptionHash: `0x${'00'.repeat(32)}`,
    status: InvoiceStatus.Created,
    dynamicEarlySettlement: false,
    ...overrides,
  };
}

describe('invoice status resolution', () => {
  it('shows a created invoice as sent', () => {
    assert.equal(resolveInvoiceStatus(invoice(), NOW).status, 'sent');
  });

  it('keeps a funded invoice in the funded state before maturity', () => {
    assert.equal(
      resolveInvoiceStatus(invoice({ status: InvoiceStatus.Funded }), NOW).status,
      'funded',
    );
  });

  it('marks a funded invoice overdue at maturity', () => {
    assert.equal(
      resolveInvoiceStatus(invoice({ status: InvoiceStatus.Funded, dueDate: NOW }), NOW).status,
      'overdue',
    );
  });

  it('maps both settlement outcomes to settled', () => {
    assert.equal(
      resolveInvoiceStatus(invoice({ status: InvoiceStatus.SettledEarly }), NOW).status,
      'settled',
    );
    assert.equal(
      resolveInvoiceStatus(invoice({ status: InvoiceStatus.SettledAtMaturity }), NOW).status,
      'settled',
    );
  });

  it('keeps cancelled and rejected terminal states distinct', () => {
    assert.equal(
      resolveInvoiceStatus(invoice({ status: InvoiceStatus.Cancelled }), NOW).status,
      'cancelled',
    );
    assert.equal(
      resolveInvoiceStatus(invoice({ status: InvoiceStatus.Rejected }), NOW).status,
      'rejected',
    );
  });
});
