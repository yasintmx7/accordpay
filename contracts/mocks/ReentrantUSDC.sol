// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IAccordPaySettlement {
    function settleEarly(uint256 invoiceId) external;
}

/**
 * @notice Test-only token that attempts to re-enter AccordPay while receiving settlement.
 */
contract ReentrantUSDC is ERC20 {
    IAccordPaySettlement public target;
    uint256 public targetInvoiceId;
    bool public attackAttempted;
    bool public blockedByGuard;

    constructor() ERC20("Reentrant Mock USDC", "rUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function configureAttack(address targetAddress, uint256 invoiceId) external {
        target = IAccordPaySettlement(targetAddress);
        targetInvoiceId = invoiceId;
    }

    function attackSettle() external {
        target.settleEarly(targetInvoiceId);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool success = super.transfer(to, amount);

        if (msg.sender == address(target) && to == address(this) && !attackAttempted) {
            attackAttempted = true;
            try target.settleEarly(targetInvoiceId) {
                blockedByGuard = false;
            } catch (bytes memory reason) {
                bytes4 selector;
                if (reason.length >= 4) {
                    assembly ("memory-safe") {
                        selector := mload(add(reason, 32))
                    }
                }
                blockedByGuard = selector == bytes4(keccak256("ReentrancyGuardReentrantCall()"));
            }
        }

        return success;
    }
}
