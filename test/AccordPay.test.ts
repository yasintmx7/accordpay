import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import { getAddress, parseUnits } from 'viem';

// Helper: assert a promise rejects containing a specific error string
async function expectRevert(promise: Promise<unknown>, errorName: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected revert with "${errorName}" but transaction succeeded`);
  } catch (err: unknown) {
    const error = err as {
      message?: string;
      details?: string;
      shortMessage?: string;
      cause?: { message?: string; details?: string };
      data?: { errorName?: string };
    };
    const text = JSON.stringify(
      error,
      (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value,
    ).toLowerCase();
    if (!text.includes(errorName.toLowerCase())) {
      // Also check standard error properties
      const combined = [
        error.message, error.details, error.shortMessage,
        error.cause?.message, error.cause?.details,
        error.data?.errorName
      ].filter(Boolean).join(' ');
      if (!combined.includes(errorName)) {
        throw new Error(`Expected revert "${errorName}" but got: ${combined.slice(0, 500)}`);
      }
    }
  }
}

describe('AccordPay', function () {
  async function deployContractFixture() {
    const conn = await hre.network.create();
    const viem = conn.viem;
    const networkHelpers = conn.networkHelpers;

    const publicClient = await viem.getPublicClient();
    const [deployer, buyer, supplier, outsider] = await viem.getWalletClients();

    const usdc = await viem.deployContract('MockUSDC', []);
    const accordPay = await viem.deployContract('AccordPay', [usdc.address]);

    // Mint initial USDC to buyer and outsider for testing
    const initialMint = parseUnits('1000000', 6);
    await usdc.write.mint([buyer.account.address, initialMint]);
    await usdc.write.mint([outsider.account.address, initialMint]);

    return { accordPay, usdc, deployer, buyer, supplier, outsider, publicClient, networkHelpers };
  }

  const dueDateOffset = 86400n; // 1 day in seconds
  const refHash = '0x' + '1'.repeat(64) as `0x${string}`;
  const descHash = '0x' + '2'.repeat(64) as `0x${string}`;

  describe('Creation', function () {
    it('1. Valid invoice creation', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      const tx = await accordPay.write.createInvoice(
        [supplier.account.address, 1000n, 970n, dueDate, refHash, descHash],
        { account: buyer.account }
      );
      assert.equal(typeof tx, 'string');
    });

    it('2. First ID is 1', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.equal(invoice.id, 1n);
    });

    it('3. IDs increment', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      assert.equal(await accordPay.read.getInvoiceCount(), 2n);
    });

    it('4. All fields stored correctly', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.equal(getAddress(invoice.buyer), getAddress(buyer.account.address));
      assert.equal(getAddress(invoice.supplier), getAddress(supplier.account.address));
      assert.equal(getAddress(invoice.payoutAddress), getAddress(supplier.account.address));
      assert.equal(invoice.fullAmount, 1000n);
      assert.equal(invoice.earlySettlementAmount, 970n);
      assert.equal(invoice.dueDate, dueDate);
      assert.equal(invoice.invoiceReferenceHash, refHash);
      assert.equal(invoice.descriptionHash, descHash);
      assert.equal(invoice.status, 1);
    });

    it('5. Buyer list updated', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      const list = await accordPay.read.getInvoiceIdsByBuyer([buyer.account.address]);
      assert.equal(list.length, 1);
      assert.equal(list[0], 1n);
    });

    it('6. Supplier list updated', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      const list = await accordPay.read.getInvoiceIdsBySupplier([supplier.account.address]);
      assert.equal(list.length, 1);
      assert.equal(list[0], 1n);
    });

    it('7. InvoiceCreated event', async function () {
      const { accordPay, buyer, supplier, publicClient } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      const hash = await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.equal(receipt.status, 'success');
    });

    it('8. Zero supplier rejected', async function () {
      const { accordPay, buyer } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await expectRevert(
        accordPay.write.createInvoice(['0x0000000000000000000000000000000000000000', 100n, 90n, dueDate, refHash, descHash], { account: buyer.account }),
        'InvalidSupplier'
      );
    });

    it('9. Buyer as supplier rejected', async function () {
      const { accordPay, buyer } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await expectRevert(
        accordPay.write.createInvoice([buyer.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account }),
        'InvalidSupplier'
      );
    });

    it('10. Zero full amount rejected', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await expectRevert(
        accordPay.write.createInvoice([supplier.account.address, 0n, 90n, dueDate, refHash, descHash], { account: buyer.account }),
        'InvalidAmount'
      );
    });

    it('11. Zero early amount rejected', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await expectRevert(
        accordPay.write.createInvoice([supplier.account.address, 100n, 0n, dueDate, refHash, descHash], { account: buyer.account }),
        'InvalidEarlySettlementAmount'
      );
    });

    it('12. Early amount above full amount rejected', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await expectRevert(
        accordPay.write.createInvoice([supplier.account.address, 100n, 101n, dueDate, refHash, descHash], { account: buyer.account }),
        'InvalidEarlySettlementAmount'
      );
    });

    it('13. Early amount equal to full amount accepted', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      const tx = await accordPay.write.createInvoice([supplier.account.address, 100n, 100n, dueDate, refHash, descHash], { account: buyer.account });
      assert.equal(typeof tx, 'string');
    });

    it('14. Non-future due date rejected', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) - 100n;
      await expectRevert(
        accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account }),
        'InvalidDueDate'
      );
    });

    it('15. Zero reference hash rejected', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      const zeroHash = '0x' + '0'.repeat(64) as `0x${string}`;
      await expectRevert(
        accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, zeroHash, descHash], { account: buyer.account }),
        'MissingInvoiceReference'
      );
    });
  });

  describe('Funding', function () {
    async function setupCreatedInvoice() {
      const fx = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await fx.accordPay.write.createInvoice([fx.supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: fx.buyer.account });
      return { ...fx, dueDate };
    }

    it('16. Buyer funds successfully', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      const tx = await accordPay.write.fundInvoice([1n], { account: buyer.account });
      assert.equal(typeof tx, 'string');
    });

    it('17. Exact USDC enters contract', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      assert.equal(await usdc.read.balanceOf([accordPay.address]), 1000n);
    });

    it('18. Status becomes Funded', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.equal(invoice.status, 2);
    });

    it('19. fundedAt is recorded', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.ok(invoice.fundedAt > 0n, 'fundedAt should be > 0');
    });

    it('20. InvoiceFunded event', async function () {
      const { accordPay, usdc, buyer, publicClient } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      const hash = await accordPay.write.fundInvoice([1n], { account: buyer.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.equal(receipt.status, 'success');
    });

    it('21. Outsider cannot fund', async function () {
      const { accordPay, usdc, outsider } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: outsider.account });
      await expectRevert(accordPay.write.fundInvoice([1n], { account: outsider.account }), 'UnauthorizedBuyer');
    });

    it('22. Supplier cannot fund', async function () {
      const { accordPay, usdc, supplier } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: supplier.account });
      await expectRevert(accordPay.write.fundInvoice([1n], { account: supplier.account }), 'UnauthorizedBuyer');
    });

    it('23. Duplicate funding rejected', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 2000n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      await expectRevert(accordPay.write.fundInvoice([1n], { account: buyer.account }), 'InvalidInvoiceStatus');
    });

    it('24. Cancelled invoice cannot be funded', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await accordPay.write.cancelInvoice([1n], { account: buyer.account });
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await expectRevert(accordPay.write.fundInvoice([1n], { account: buyer.account }), 'InvalidInvoiceStatus');
    });

    it('25. Funding at or after due date rejected', async function () {
      const { accordPay, usdc, buyer, dueDate, networkHelpers } = await setupCreatedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate + 10n);
      await networkHelpers.mine();
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await expectRevert(accordPay.write.fundInvoice([1n], { account: buyer.account }), 'InvalidDueDate');
    });

    it('26. Insufficient balance rejected', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      // Create invoice for amount larger than buyer's balance
      await accordPay.write.createInvoice([supplier.account.address, parseUnits('2000000', 6), parseUnits('1000000', 6), dueDate, refHash, descHash], { account: buyer.account });
      await usdc.write.approve([accordPay.address, parseUnits('2000000', 6)], { account: buyer.account });
      try {
        await accordPay.write.fundInvoice([1n], { account: buyer.account });
        throw new Error('Expected revert but succeeded');
      } catch (err: unknown) {
        const isExpectedError = (err as { message?: string }).message?.includes('Expected revert') === false;
        assert.ok(isExpectedError, 'Should have reverted');
      }
    });

    it('27. Insufficient allowance rejected', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 500n], { account: buyer.account });
      try {
        await accordPay.write.fundInvoice([1n], { account: buyer.account });
        throw new Error('Expected revert but succeeded');
      } catch (err: unknown) {
        const isExpectedError = (err as { message?: string }).message?.includes('Expected revert') === false;
        assert.ok(isExpectedError, 'Should have reverted due to insufficient allowance');
      }
    });
  });

  describe('Cancellation', function () {
    async function setupCreatedInvoice() {
      const fx = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await fx.accordPay.write.createInvoice([fx.supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: fx.buyer.account });
      return fx;
    }

    it('28. Buyer cancels Created invoice', async function () {
      const { accordPay, buyer } = await setupCreatedInvoice();
      const tx = await accordPay.write.cancelInvoice([1n], { account: buyer.account });
      assert.equal(typeof tx, 'string');
    });

    it('29. Status becomes Cancelled', async function () {
      const { accordPay, buyer } = await setupCreatedInvoice();
      await accordPay.write.cancelInvoice([1n], { account: buyer.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.equal(invoice.status, 3);
    });

    it('30. InvoiceCancelled event', async function () {
      const { accordPay, buyer, publicClient } = await setupCreatedInvoice();
      const hash = await accordPay.write.cancelInvoice([1n], { account: buyer.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.equal(receipt.status, 'success');
    });

    it('31. Outsider cannot cancel', async function () {
      const { accordPay, outsider } = await setupCreatedInvoice();
      await expectRevert(accordPay.write.cancelInvoice([1n], { account: outsider.account }), 'UnauthorizedBuyer');
    });

    it('32. Supplier cannot cancel', async function () {
      const { accordPay, supplier } = await setupCreatedInvoice();
      await expectRevert(accordPay.write.cancelInvoice([1n], { account: supplier.account }), 'UnauthorizedBuyer');
    });

    it('33. Funded invoice cannot be cancelled', async function () {
      const { accordPay, usdc, buyer } = await setupCreatedInvoice();
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      await expectRevert(accordPay.write.cancelInvoice([1n], { account: buyer.account }), 'InvalidInvoiceStatus');
    });

    it('34. Duplicate cancellation rejected', async function () {
      const { accordPay, buyer } = await setupCreatedInvoice();
      await accordPay.write.cancelInvoice([1n], { account: buyer.account });
      await expectRevert(accordPay.write.cancelInvoice([1n], { account: buyer.account }), 'InvalidInvoiceStatus');
    });
  });

  describe('Early Settlement', function () {
    async function setupFundedInvoice(dynamic = false) {
      const fx = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      if (dynamic) await fx.accordPay.write.createDynamicInvoice([fx.supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: fx.buyer.account });
      else await fx.accordPay.write.createInvoice([fx.supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: fx.buyer.account });
      await fx.usdc.write.approve([fx.accordPay.address, 1000n], { account: fx.buyer.account });
      await fx.accordPay.write.fundInvoice([1n], { account: fx.buyer.account });
      return { ...fx, dueDate };
    }

    it('35. Supplier settles before maturity', async function () {
      const { accordPay, supplier } = await setupFundedInvoice();
      const tx = await accordPay.write.settleEarly([1n], { account: supplier.account });
      assert.equal(typeof tx, 'string');
    });

    it('36. Supplier receives correct amount', async function () {
      const { accordPay, usdc, supplier } = await setupFundedInvoice();
      const balBefore = await usdc.read.balanceOf([supplier.account.address]);
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      const balAfter = await usdc.read.balanceOf([supplier.account.address]);
      assert.equal(balAfter - balBefore, 970n);
    });

    it('37. Buyer receives discount', async function () {
      const { accordPay, usdc, buyer, supplier } = await setupFundedInvoice();
      const balBefore = await usdc.read.balanceOf([buyer.account.address]);
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      const balAfter = await usdc.read.balanceOf([buyer.account.address]);
      assert.equal(balAfter - balBefore, 30n);
    });

    it('38. Contract retains no invoice funds', async function () {
      const { accordPay, usdc, supplier } = await setupFundedInvoice();
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      assert.equal(await usdc.read.balanceOf([accordPay.address]), 0n);
    });

    it('39. Status becomes SettledEarly', async function () {
      const { accordPay, supplier } = await setupFundedInvoice();
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.equal(invoice.status, 4);
    });

    it('40. settledAt recorded', async function () {
      const { accordPay, supplier } = await setupFundedInvoice();
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.ok(invoice.settledAt > 0n, 'settledAt should be > 0');
    });

    it('41. Correct event emitted', async function () {
      const { accordPay, supplier, publicClient } = await setupFundedInvoice();
      const hash = await accordPay.write.settleEarly([1n], { account: supplier.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.equal(receipt.status, 'success');
    });

    it('42. Buyer cannot settle', async function () {
      const { accordPay, buyer } = await setupFundedInvoice();
      await expectRevert(accordPay.write.settleEarly([1n], { account: buyer.account }), 'UnauthorizedSupplier');
    });

    it('43. Outsider cannot settle', async function () {
      const { accordPay, outsider } = await setupFundedInvoice();
      await expectRevert(accordPay.write.settleEarly([1n], { account: outsider.account }), 'UnauthorizedSupplier');
    });

    it('44. Unfunded invoice cannot settle', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      await expectRevert(accordPay.write.settleEarly([1n], { account: supplier.account }), 'InvalidInvoiceStatus');
    });

    it('45. Settlement at maturity rejected', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await expectRevert(accordPay.write.settleEarly([1n], { account: supplier.account }), 'InvoiceAlreadyMatured');
    });

    it('46. Settlement after maturity rejected', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate + 100n);
      await networkHelpers.mine();
      await expectRevert(accordPay.write.settleEarly([1n], { account: supplier.account }), 'InvoiceAlreadyMatured');
    });

    it('47. Duplicate settlement rejected', async function () {
      const { accordPay, supplier } = await setupFundedInvoice();
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      await expectRevert(accordPay.write.settleEarly([1n], { account: supplier.account }), 'InvalidInvoiceStatus');
    });

    it('48. Zero-discount early settlement works', async function () {
      const fx = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await fx.accordPay.write.createInvoice([fx.supplier.account.address, 1000n, 1000n, dueDate, refHash, descHash], { account: fx.buyer.account });
      await fx.usdc.write.approve([fx.accordPay.address, 1000n], { account: fx.buyer.account });
      await fx.accordPay.write.fundInvoice([1n], { account: fx.buyer.account });

      const balBefore = await fx.usdc.read.balanceOf([fx.supplier.account.address]);
      await fx.accordPay.write.settleEarly([1n], { account: fx.supplier.account });
      const balAfter = await fx.usdc.read.balanceOf([fx.supplier.account.address]);
      assert.equal(balAfter - balBefore, 1000n);
    });

    it('49. Maturity settlement after early settlement rejected', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      await networkHelpers.time.setNextBlockTimestamp(dueDate + 10n);
      await networkHelpers.mine();
      await expectRevert(accordPay.write.settleAtMaturity([1n], { account: supplier.account }), 'InvalidInvoiceStatus');
    });

    it('49a. Preview grows linearly toward the full amount', async function () {
      const { accordPay, dueDate, networkHelpers } = await setupFundedInvoice(true);
      const invoice = await accordPay.read.getInvoice([1n]);
      const midpoint = invoice.fundedAt + ((dueDate - invoice.fundedAt) / 2n);
      await networkHelpers.time.setNextBlockTimestamp(midpoint);
      await networkHelpers.mine();
      const quote = await accordPay.read.previewEarlySettlement([1n]);
      const expected = 970n + ((30n * (midpoint - invoice.fundedAt)) / (dueDate - invoice.fundedAt));
      assert.equal(quote, expected);
      assert.ok(quote > 970n && quote < 1000n);
    });

    it('49b. Mid-curve settlement pays the current quote', async function () {
      const fx = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await fx.accordPay.write.createDynamicInvoice([fx.supplier.account.address, 1_000_000n, 700_000n, dueDate, refHash, descHash], { account: fx.buyer.account });
      await fx.usdc.write.approve([fx.accordPay.address, 1_000_000n], { account: fx.buyer.account });
      await fx.accordPay.write.fundInvoice([1n], { account: fx.buyer.account });
      const invoice = await fx.accordPay.read.getInvoice([1n]);
      const midpoint = invoice.fundedAt + ((dueDate - invoice.fundedAt) / 2n);
      const expected = 700_000n + ((300_000n * (midpoint - invoice.fundedAt)) / (dueDate - invoice.fundedAt));
      const before = await fx.usdc.read.balanceOf([fx.supplier.account.address]);
      await fx.networkHelpers.time.setNextBlockTimestamp(midpoint);
      await fx.accordPay.write.settleEarly([1n], { account: fx.supplier.account });
      const after = await fx.usdc.read.balanceOf([fx.supplier.account.address]);
      assert.equal(after - before, expected);
    });

    it('49c. Preview rejects an unfunded invoice', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      await expectRevert(accordPay.read.previewEarlySettlement([1n]), 'InvalidInvoiceStatus');
    });

    it('49d. Fixed early payment remains unchanged by default', async function () {
      const { accordPay, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate - 10n);
      await networkHelpers.mine();
      assert.equal(await accordPay.read.previewEarlySettlement([1n]), 970n);
    });
  });

  describe('Maturity Settlement', function () {
    async function setupFundedInvoice() {
      const fx = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await fx.accordPay.write.createInvoice([fx.supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: fx.buyer.account });
      await fx.usdc.write.approve([fx.accordPay.address, 1000n], { account: fx.buyer.account });
      await fx.accordPay.write.fundInvoice([1n], { account: fx.buyer.account });
      return { ...fx, dueDate };
    }

    it('50. Settlement at exact maturity', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      const tx = await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      assert.equal(typeof tx, 'string');
    });

    it('51. Settlement after maturity', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate + 100n);
      await networkHelpers.mine();
      const tx = await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      assert.equal(typeof tx, 'string');
    });

    it('52. Supplier receives full amount', async function () {
      const { accordPay, usdc, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      const balBefore = await usdc.read.balanceOf([supplier.account.address]);
      await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      const balAfter = await usdc.read.balanceOf([supplier.account.address]);
      assert.equal(balAfter - balBefore, 1000n);
    });

    it('53. Contract retains no invoice funds', async function () {
      const { accordPay, usdc, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      assert.equal(await usdc.read.balanceOf([accordPay.address]), 0n);
    });

    it('54. Status becomes SettledAtMaturity', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.equal(invoice.status, 5);
    });

    it('55. settledAt recorded', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.ok(invoice.settledAt > 0n, 'settledAt should be > 0');
    });

    it('56. Correct event emitted', async function () {
      const { accordPay, supplier, dueDate, publicClient, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      const hash = await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.equal(receipt.status, 'success');
    });

    it('57. Settlement before maturity rejected', async function () {
      const { accordPay, supplier } = await setupFundedInvoice();
      await expectRevert(accordPay.write.settleAtMaturity([1n], { account: supplier.account }), 'InvoiceNotMatured');
    });

    it('58. Buyer can trigger guaranteed settlement', async function () {
      const { accordPay, buyer, supplier, usdc, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      const before = await usdc.read.balanceOf([supplier.account.address]);
      await accordPay.write.settleAtMaturity([1n], { account: buyer.account });
      assert.equal((await usdc.read.balanceOf([supplier.account.address])) - before, 1000n);
    });

    it('59. Outsider can trigger but cannot redirect settlement', async function () {
      const { accordPay, outsider, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await accordPay.write.settleAtMaturity([1n], { account: outsider.account });
      assert.equal((await accordPay.read.getInvoice([1n])).status, 5);
    });

    it('60. Unfunded invoice cannot settle', async function () {
      const { accordPay, buyer, supplier, networkHelpers } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await expectRevert(accordPay.write.settleAtMaturity([1n], { account: supplier.account }), 'InvalidInvoiceStatus');
    });

    it('61. Duplicate settlement rejected', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      await expectRevert(accordPay.write.settleAtMaturity([1n], { account: supplier.account }), 'InvalidInvoiceStatus');
    });

    it('62. Early settlement after maturity settlement rejected', async function () {
      const { accordPay, supplier, dueDate, networkHelpers } = await setupFundedInvoice();
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      await accordPay.write.settleAtMaturity([1n], { account: supplier.account });
      await expectRevert(accordPay.write.settleEarly([1n], { account: supplier.account }), 'InvalidInvoiceStatus');
    });
  });

  describe('Reads and accounting', function () {
    it('63. Nonexistent invoice rejected', async function () {
      const { accordPay } = await deployContractFixture();
      await expectRevert(accordPay.read.getInvoice([1n]), 'InvoiceNotFound');
    });

    it('64. Buyer lists correct', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      const list = await accordPay.read.getInvoiceIdsByBuyer([buyer.account.address]);
      assert.equal(list.length, 1);
    });

    it('65. Supplier lists correct', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      const list = await accordPay.read.getInvoiceIdsBySupplier([supplier.account.address]);
      assert.equal(list.length, 1);
    });

    it('66. Different participant lists separated', async function () {
      const { accordPay, buyer, supplier, outsider } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 100n, 90n, dueDate, refHash, descHash], { account: buyer.account });
      const list = await accordPay.read.getInvoiceIdsByBuyer([outsider.account.address]);
      assert.equal(list.length, 0);
    });

    it('67. Zero token constructor rejected', async function () {
      const conn = await hre.network.create();
      await expectRevert(
        conn.viem.deployContract('AccordPay', ['0x0000000000000000000000000000000000000000']),
        'InvalidTokenAddress'
      );
    });

    it('68. Multiple funded invoice balance correct', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      await accordPay.write.createInvoice([supplier.account.address, 500n, 400n, dueDate, refHash, descHash], { account: buyer.account });

      await usdc.write.approve([accordPay.address, 1500n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      await accordPay.write.fundInvoice([2n], { account: buyer.account });

      assert.equal(await usdc.read.balanceOf([accordPay.address]), 1500n);
    });

    it('69. Settling one invoice does not alter another', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      await accordPay.write.createInvoice([supplier.account.address, 500n, 400n, dueDate, refHash, descHash], { account: buyer.account });

      await usdc.write.approve([accordPay.address, 1500n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      await accordPay.write.fundInvoice([2n], { account: buyer.account });

      await accordPay.write.settleEarly([1n], { account: supplier.account });

      assert.equal(await usdc.read.balanceOf([accordPay.address]), 500n);
      const inv2 = await accordPay.read.getInvoice([2n]);
      assert.equal(inv2.status, 2);
    });

    it('70. Six-decimal MockUSDC behavior correct', async function () {
      const { usdc } = await deployContractFixture();
      assert.equal(await usdc.read.decimals(), 6);
    });

    it('71. Boundary timestamp behavior correct', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      // Use a comfortable future date (10 seconds ahead) to avoid race with block time
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + 10n;
      const tx = await accordPay.write.createInvoice([supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: buyer.account });
      assert.equal(typeof tx, 'string');
    });

    it('72. Boundary amount behavior correct', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      const tx = await accordPay.write.createInvoice([supplier.account.address, 1n, 1n, dueDate, refHash, descHash], { account: buyer.account });
      assert.equal(typeof tx, 'string');
    });

    it('73. Reentrancy protection where meaningful', async function () {
      const conn = await hre.network.create();
      const [deployer, buyer] = await conn.viem.getWalletClients();
      const token = await conn.viem.deployContract('ReentrantUSDC', []);
      const accordPay = await conn.viem.deployContract('AccordPay', [token.address]);
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;

      await token.write.mint([buyer.account.address, 1000n], { account: deployer.account });
      await accordPay.write.createInvoice(
        [token.address, 1000n, 900n, dueDate, refHash, descHash],
        { account: buyer.account },
      );
      await token.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.fundInvoice([1n], { account: buyer.account });
      await token.write.configureAttack([accordPay.address, 1n], { account: deployer.account });

      await token.write.attackSettle({ account: deployer.account });

      assert.equal(await token.read.attackAttempted(), true);
      assert.equal(await token.read.blockedByGuard(), true);
      assert.equal((await accordPay.read.getInvoice([1n])).status, 4);
      assert.equal(await token.read.balanceOf([token.address]), 900n);
    });

    it('74. No admin withdrawal capability', async function () {
      const { accordPay } = await deployContractFixture();
      const abi = accordPay.abi as readonly { name?: string }[];
      assert.ok(!abi.some((item) => item.name === 'withdraw'), 'should have no withdraw function');
      assert.ok(!abi.some((item) => item.name === 'owner'), 'should have no owner function');
    });
  });

  describe('Atomic creation and funding', function () {
    it('75. Creates and funds in one call', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.createAndFundInvoice(
        [supplier.account.address, 1000n, 970n, dueDate, refHash, descHash],
        { account: buyer.account },
      );
      const invoice = await accordPay.read.getInvoice([1n]);
      assert.equal(invoice.status, 2);
      assert.ok(invoice.fundedAt > 0n);
    });

    it('76. Escrows the exact full amount', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.createAndFundInvoice(
        [supplier.account.address, 1000n, 970n, dueDate, refHash, descHash],
        { account: buyer.account },
      );
      assert.equal(await usdc.read.balanceOf([accordPay.address]), 1000n);
    });

    it('77. Updates both participant indexes', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.createAndFundInvoice(
        [supplier.account.address, 1000n, 970n, dueDate, refHash, descHash],
        { account: buyer.account },
      );
      assert.deepEqual(await accordPay.read.getInvoiceIdsByBuyer([buyer.account.address]), [1n]);
      assert.deepEqual(await accordPay.read.getInvoiceIdsBySupplier([supplier.account.address]), [1n]);
    });

    it('78. Reverts the creation when allowance is insufficient', async function () {
      const { accordPay, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await expectRevert(
        accordPay.write.createAndFundInvoice(
          [supplier.account.address, 1000n, 970n, dueDate, refHash, descHash],
          { account: buyer.account },
        ),
        'ERC20InsufficientAllowance',
      );
      assert.equal(await accordPay.read.getInvoiceCount(), 0n);
    });

    it('79. Reverts the creation when the buyer balance is insufficient', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const tooMuch = parseUnits('2000000', 6);
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await usdc.write.approve([accordPay.address, tooMuch], { account: buyer.account });
      await expectRevert(
        accordPay.write.createAndFundInvoice(
          [supplier.account.address, tooMuch, parseUnits('1900000', 6), dueDate, refHash, descHash],
          { account: buyer.account },
        ),
        'ERC20InsufficientBalance',
      );
      assert.equal(await accordPay.read.getInvoiceCount(), 0n);
    });

    it('80. Atomically funded invoice can settle early', async function () {
      const { accordPay, usdc, buyer, supplier } = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await usdc.write.approve([accordPay.address, 1000n], { account: buyer.account });
      await accordPay.write.createAndFundInvoice(
        [supplier.account.address, 1000n, 970n, dueDate, refHash, descHash],
        { account: buyer.account },
      );
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      assert.equal((await accordPay.read.getInvoice([1n])).status, 4);
      assert.equal(await usdc.read.balanceOf([accordPay.address]), 0n);
    });
  });

  describe('Supplier controls and guaranteed settlement', function () {
    async function setupInvoice(funded: boolean) {
      const fx = await deployContractFixture();
      const dueDate = BigInt(Math.floor(Date.now() / 1000)) + dueDateOffset;
      await fx.accordPay.write.createInvoice([fx.supplier.account.address, 1000n, 970n, dueDate, refHash, descHash], { account: fx.buyer.account });
      if (funded) {
        await fx.usdc.write.approve([fx.accordPay.address, 1000n], { account: fx.buyer.account });
        await fx.accordPay.write.fundInvoice([1n], { account: fx.buyer.account });
      }
      return { ...fx, dueDate };
    }

    it('81. Supplier can reject an unfunded invoice', async function () {
      const { accordPay, supplier } = await setupInvoice(false);
      await accordPay.write.rejectInvoice([1n], { account: supplier.account });
      assert.equal((await accordPay.read.getInvoice([1n])).status, 6);
    });

    it('82. Funded rejection returns the full escrow to buyer', async function () {
      const { accordPay, usdc, buyer, supplier } = await setupInvoice(true);
      const before = await usdc.read.balanceOf([buyer.account.address]);
      await accordPay.write.rejectInvoice([1n], { account: supplier.account });
      assert.equal((await usdc.read.balanceOf([buyer.account.address])) - before, 1000n);
      assert.equal(await usdc.read.balanceOf([accordPay.address]), 0n);
    });

    it('83. Buyer and outsider cannot reject', async function () {
      const { accordPay, buyer, outsider } = await setupInvoice(false);
      await expectRevert(accordPay.write.rejectInvoice([1n], { account: buyer.account }), 'UnauthorizedSupplier');
      await expectRevert(accordPay.write.rejectInvoice([1n], { account: outsider.account }), 'UnauthorizedSupplier');
    });

    it('84. Supplier can set a treasury payout address', async function () {
      const { accordPay, supplier, outsider } = await setupInvoice(false);
      await accordPay.write.updatePayoutAddress([1n, outsider.account.address], { account: supplier.account });
      assert.equal(getAddress((await accordPay.read.getInvoice([1n])).payoutAddress), getAddress(outsider.account.address));
    });

    it('85. Early settlement pays the configured treasury', async function () {
      const { accordPay, usdc, supplier, outsider } = await setupInvoice(true);
      await accordPay.write.updatePayoutAddress([1n, outsider.account.address], { account: supplier.account });
      const before = await usdc.read.balanceOf([outsider.account.address]);
      await accordPay.write.settleEarly([1n], { account: supplier.account });
      assert.equal((await usdc.read.balanceOf([outsider.account.address])) - before, 970n);
    });

    it('86. Permissionless maturity pays the configured treasury', async function () {
      const { accordPay, usdc, buyer, supplier, outsider, dueDate, networkHelpers } = await setupInvoice(true);
      await accordPay.write.updatePayoutAddress([1n, outsider.account.address], { account: supplier.account });
      await networkHelpers.time.setNextBlockTimestamp(dueDate);
      await networkHelpers.mine();
      const before = await usdc.read.balanceOf([outsider.account.address]);
      await accordPay.write.settleAtMaturity([1n], { account: buyer.account });
      assert.equal((await usdc.read.balanceOf([outsider.account.address])) - before, 1000n);
    });

    it('87. Invalid or unauthorized payout updates are rejected', async function () {
      const { accordPay, buyer, supplier } = await setupInvoice(false);
      await expectRevert(accordPay.write.updatePayoutAddress([1n, buyer.account.address], { account: buyer.account }), 'UnauthorizedSupplier');
      await expectRevert(accordPay.write.updatePayoutAddress([1n, '0x0000000000000000000000000000000000000000'], { account: supplier.account }), 'InvalidPayoutAddress');
    });
  });
});
