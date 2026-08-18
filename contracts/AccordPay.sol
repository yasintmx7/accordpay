// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AccordPay
 * @notice Programmable non-custodial B2B invoice-settlement protocol.
 */
contract AccordPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable settlementToken;
    uint256 private _currentInvoiceId;

    enum InvoiceStatus {
        None,
        Created,
        Funded,
        Cancelled,
        SettledEarly,
        SettledAtMaturity,
        Rejected
    }

    struct Invoice {
        uint256 id;
        address buyer;
        address supplier;
        address payoutAddress;
        uint256 fullAmount;
        uint256 earlySettlementAmount;
        uint64 dueDate;
        uint64 createdAt;
        uint64 fundedAt;
        uint64 settledAt;
        bytes32 invoiceReferenceHash;
        bytes32 descriptionHash;
        InvoiceStatus status;
        bool dynamicEarlySettlement;
    }

    mapping(uint256 => Invoice) private _invoices;
    mapping(address => uint256[]) private _buyerInvoices;
    mapping(address => uint256[]) private _supplierInvoices;

    error InvalidTokenAddress();
    error InvalidSupplier();
    error InvalidPayoutAddress();
    error InvalidAmount();
    error InvalidEarlySettlementAmount();
    error InvalidDueDate();
    error MissingInvoiceReference();
    error InvoiceNotFound();
    error UnauthorizedBuyer();
    error UnauthorizedSupplier();
    error InvalidInvoiceStatus();
    error InvoiceNotMatured();
    error InvoiceAlreadyMatured();
    error UnexpectedTransferAmount();

    event InvoiceCreated(
        uint256 indexed id,
        address indexed buyer,
        address indexed supplier,
        uint256 fullAmount,
        uint256 earlySettlementAmount,
        uint64 dueDate
    );
    event InvoiceFunded(uint256 indexed id, address indexed buyer, uint256 amount);
    event InvoiceCancelled(uint256 indexed id);
    event InvoiceRejected(uint256 indexed id, address indexed supplier, uint256 returnedToBuyer);
    event PayoutAddressUpdated(uint256 indexed id, address indexed supplier, address indexed payoutAddress);
    event InvoiceSettledEarly(uint256 indexed id, address indexed buyer, address indexed payoutAddress, uint256 paidToSupplier, uint256 returnedToBuyer, uint64 timestamp);
    event InvoiceSettledAtMaturity(uint256 indexed id, address indexed payoutAddress, address indexed triggeredBy, uint256 paidToSupplier, uint64 timestamp);

    constructor(address _settlementToken) {
        if (_settlementToken == address(0)) revert InvalidTokenAddress();
        settlementToken = IERC20(_settlementToken);
    }

    function createInvoice(
        address supplier,
        uint256 fullAmount,
        uint256 earlySettlementAmount,
        uint64 dueDate,
        bytes32 invoiceReferenceHash,
        bytes32 descriptionHash
    ) external returns (uint256 invoiceId) {
        invoiceId = _createInvoice(
            msg.sender,
            supplier,
            fullAmount,
            earlySettlementAmount,
            dueDate,
            invoiceReferenceHash,
            descriptionHash,
            false
        );
    }

    function createDynamicInvoice(
        address supplier,
        uint256 fullAmount,
        uint256 startingEarlySettlementAmount,
        uint64 dueDate,
        bytes32 invoiceReferenceHash,
        bytes32 descriptionHash
    ) external returns (uint256 invoiceId) {
        invoiceId = _createInvoice(msg.sender, supplier, fullAmount, startingEarlySettlementAmount, dueDate, invoiceReferenceHash, descriptionHash, true);
    }

    /**
     * @notice Creates and funds an invoice atomically after the buyer has approved USDC.
     * @dev AccordPay exclusively uses the 6-decimal ERC-20 USDC interface on Arc.
     */
    function createAndFundInvoice(
        address supplier,
        uint256 fullAmount,
        uint256 earlySettlementAmount,
        uint64 dueDate,
        bytes32 invoiceReferenceHash,
        bytes32 descriptionHash
    ) external nonReentrant returns (uint256 invoiceId) {
        invoiceId = _createInvoice(
            msg.sender,
            supplier,
            fullAmount,
            earlySettlementAmount,
            dueDate,
            invoiceReferenceHash,
            descriptionHash,
            false
        );
        _fundInvoice(_invoices[invoiceId]);
    }

    function createAndFundDynamicInvoice(
        address supplier,
        uint256 fullAmount,
        uint256 startingEarlySettlementAmount,
        uint64 dueDate,
        bytes32 invoiceReferenceHash,
        bytes32 descriptionHash
    ) external nonReentrant returns (uint256 invoiceId) {
        invoiceId = _createInvoice(msg.sender, supplier, fullAmount, startingEarlySettlementAmount, dueDate, invoiceReferenceHash, descriptionHash, true);
        _fundInvoice(_invoices[invoiceId]);
    }

    function _createInvoice(
        address buyer,
        address supplier,
        uint256 fullAmount,
        uint256 earlySettlementAmount,
        uint64 dueDate,
        bytes32 invoiceReferenceHash,
        bytes32 descriptionHash,
        bool dynamicEarlySettlement
    ) internal returns (uint256 invoiceId) {
        if (supplier == address(0) || supplier == buyer) revert InvalidSupplier();
        if (fullAmount == 0) revert InvalidAmount();
        if (earlySettlementAmount == 0 || earlySettlementAmount > fullAmount) revert InvalidEarlySettlementAmount();
        if (dueDate <= block.timestamp) revert InvalidDueDate();
        if (invoiceReferenceHash == bytes32(0)) revert MissingInvoiceReference();

        _currentInvoiceId++;
        invoiceId = _currentInvoiceId;

        _invoices[invoiceId] = Invoice({
            id: invoiceId,
            buyer: buyer,
            supplier: supplier,
            payoutAddress: supplier,
            fullAmount: fullAmount,
            earlySettlementAmount: earlySettlementAmount,
            dueDate: dueDate,
            createdAt: uint64(block.timestamp),
            fundedAt: 0,
            settledAt: 0,
            invoiceReferenceHash: invoiceReferenceHash,
            descriptionHash: descriptionHash,
            status: InvoiceStatus.Created,
            dynamicEarlySettlement: dynamicEarlySettlement
        });

        _buyerInvoices[buyer].push(invoiceId);
        _supplierInvoices[supplier].push(invoiceId);

        emit InvoiceCreated(invoiceId, buyer, supplier, fullAmount, earlySettlementAmount, dueDate);
    }

    function fundInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.buyer != msg.sender) revert UnauthorizedBuyer();
        if (invoice.status != InvoiceStatus.Created) revert InvalidInvoiceStatus();
        if (block.timestamp >= invoice.dueDate) revert InvalidDueDate();

        _fundInvoice(invoice);
    }

    function _fundInvoice(Invoice storage invoice) internal {
        uint256 balanceBefore = settlementToken.balanceOf(address(this));

        invoice.status = InvoiceStatus.Funded;
        invoice.fundedAt = uint64(block.timestamp);
        settlementToken.safeTransferFrom(invoice.buyer, address(this), invoice.fullAmount);

        if (settlementToken.balanceOf(address(this)) - balanceBefore != invoice.fullAmount) {
            revert UnexpectedTransferAmount();
        }

        emit InvoiceFunded(invoice.id, invoice.buyer, invoice.fullAmount);
    }

    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.buyer != msg.sender) revert UnauthorizedBuyer();
        if (invoice.status != InvoiceStatus.Created) revert InvalidInvoiceStatus();

        invoice.status = InvoiceStatus.Cancelled;
        
        emit InvoiceCancelled(invoiceId);
    }

    /**
     * @notice Lets the named supplier reject incorrect terms and safely returns funded escrow.
     */
    function rejectInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.supplier != msg.sender) revert UnauthorizedSupplier();
        if (invoice.status != InvoiceStatus.Created && invoice.status != InvoiceStatus.Funded) revert InvalidInvoiceStatus();

        uint256 refund = invoice.status == InvoiceStatus.Funded ? invoice.fullAmount : 0;
        invoice.status = InvoiceStatus.Rejected;
        if (refund > 0) settlementToken.safeTransfer(invoice.buyer, refund);

        emit InvoiceRejected(invoiceId, invoice.supplier, refund);
    }

    /**
     * @notice Lets the supplier route settlement to a treasury or another controlled wallet.
     */
    function updatePayoutAddress(uint256 invoiceId, address payoutAddress) external {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.supplier != msg.sender) revert UnauthorizedSupplier();
        if (invoice.status != InvoiceStatus.Created && invoice.status != InvoiceStatus.Funded) revert InvalidInvoiceStatus();
        if (payoutAddress == address(0)) revert InvalidPayoutAddress();

        invoice.payoutAddress = payoutAddress;
        emit PayoutAddressUpdated(invoiceId, invoice.supplier, payoutAddress);
    }

    function settleEarly(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.supplier != msg.sender) revert UnauthorizedSupplier();
        if (invoice.status != InvoiceStatus.Funded) revert InvalidInvoiceStatus();
        if (block.timestamp >= invoice.dueDate) revert InvoiceAlreadyMatured();

        invoice.status = InvoiceStatus.SettledEarly;
        invoice.settledAt = uint64(block.timestamp);

        uint256 supplierPayout = _earlySettlementQuote(invoice);
        uint256 discount = invoice.fullAmount - supplierPayout;
        
        settlementToken.safeTransfer(invoice.payoutAddress, supplierPayout);
        if (discount > 0) {
            settlementToken.safeTransfer(invoice.buyer, discount);
        }

        emit InvoiceSettledEarly(invoiceId, invoice.buyer, invoice.payoutAddress, supplierPayout, discount, invoice.settledAt);
    }

    function settleAtMaturity(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Funded) revert InvalidInvoiceStatus();
        if (block.timestamp < invoice.dueDate) revert InvoiceNotMatured();

        invoice.status = InvoiceStatus.SettledAtMaturity;
        invoice.settledAt = uint64(block.timestamp);

        settlementToken.safeTransfer(invoice.payoutAddress, invoice.fullAmount);

        emit InvoiceSettledAtMaturity(invoiceId, invoice.payoutAddress, msg.sender, invoice.fullAmount, invoice.settledAt);
    }

    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        if (_invoices[invoiceId].id == 0) revert InvoiceNotFound();
        return _invoices[invoiceId];
    }

    /**
     * @notice Returns the supplier payout available now.
     * @dev The payout grows linearly from the configured minimum at funding to the full amount at maturity.
     */
    function previewEarlySettlement(uint256 invoiceId) external view returns (uint256) {
        Invoice storage invoice = _invoices[invoiceId];
        if (invoice.id == 0) revert InvoiceNotFound();
        if (invoice.status != InvoiceStatus.Funded) revert InvalidInvoiceStatus();
        return _earlySettlementQuote(invoice);
    }

    function _earlySettlementQuote(Invoice storage invoice) internal view returns (uint256) {
        if (!invoice.dynamicEarlySettlement) return invoice.earlySettlementAmount;
        if (block.timestamp >= invoice.dueDate) return invoice.fullAmount;

        uint256 discountRange = invoice.fullAmount - invoice.earlySettlementAmount;
        if (discountRange == 0) return invoice.fullAmount;

        uint256 duration = uint256(invoice.dueDate) - uint256(invoice.fundedAt);
        uint256 elapsed = block.timestamp - uint256(invoice.fundedAt);
        return invoice.earlySettlementAmount + ((discountRange * elapsed) / duration);
    }

    function getInvoiceIdsByBuyer(address buyer) external view returns (uint256[] memory) {
        return _buyerInvoices[buyer];
    }

    function getInvoiceIdsBySupplier(address supplier) external view returns (uint256[] memory) {
        return _supplierInvoices[supplier];
    }

    function getInvoiceCount() external view returns (uint256) {
        return _currentInvoiceId;
    }

    function getSettlementToken() external view returns (address) {
        return address(settlementToken);
    }
}
