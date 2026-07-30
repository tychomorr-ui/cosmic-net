// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SovereignOwnable
/// @notice Two-step ownership handoff with renunciation permanently disabled.
///
/// Why this exists instead of OpenZeppelin `Ownable`:
///   - OZ `Ownable.transferOwnership` is one-step: a single mistyped address
///     hands the contract to an unrecoverable account.
///   - OZ `Ownable.renounceOwnership` is live by default: one call permanently
///     bricks every owner-gated function.
///
/// This mirrors invariant #4 of the TruthCoin audit scope: ownership cannot be
/// burned by a typo, cannot be taken by a non-nominee, and `pendingOwner` is
/// cleared on accept.
abstract contract SovereignOwnable {
    /// @notice Current owner. Holds all owner-gated authority.
    address public owner;

    /// @notice Nominated successor. Holds no authority until it accepts.
    address public pendingOwner;

    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error RenounceDisabled();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    /// @notice Step 1. Nominate a successor. Nothing changes until it accepts.
    /// @dev Re-nominating simply replaces the pending nominee.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Cancel an outstanding nomination.
    function cancelOwnershipTransfer() external onlyOwner {
        pendingOwner = address(0);
        emit OwnershipTransferStarted(owner, address(0));
    }

    /// @notice Step 2. Only the nominee can complete the handoff, which proves
    ///         the nominee can actually sign. The old owner loses authority here.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address prev = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(prev, owner);
    }

    /// @notice Permanently disabled. Present so that any inherited or expected
    ///         `renounceOwnership()` call reverts loudly instead of bricking the
    ///         contract.
    function renounceOwnership() external pure {
        revert RenounceDisabled();
    }
}
