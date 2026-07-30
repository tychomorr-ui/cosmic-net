// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MultiSigGoverned
/// @notice A real M-of-N threshold gate for privileged parameter changes.
///
/// The bug this replaces: an `onlyMultiSig` modifier that merely asserted
/// `isSigner[msg.sender]` and never read the threshold. That is weaker than a
/// single-owner check — it widens authority from one owner to any one signer.
///
/// Here, functions marked `onlyGovernance` are callable ONLY by this contract
/// calling itself, and the only path to a self-call is `execute()`, which
/// requires `threshold` distinct approvals. The threshold is therefore load
/// bearing rather than decorative.
///
/// Flow: propose(data) -> approve(id) x threshold -> execute(id)
abstract contract MultiSigGoverned {
    struct Proposal {
        /// @dev ABI-encoded call to be made against this contract.
        bytes data;
        uint256 approvals;
        uint256 createdAt;
        bool executed;
        bool cancelled;
    }

    address[] internal _signers;
    mapping(address => bool) public isSigner;

    /// @notice Number of distinct signer approvals required to execute.
    uint256 public threshold;

    Proposal[] internal _proposals;

    /// @notice proposalId => signer => approved
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdUpdated(uint256 threshold);
    event ProposalCreated(uint256 indexed id, address indexed proposer, bytes data);
    event ProposalApproved(uint256 indexed id, address indexed signer, uint256 approvals);
    event ProposalRevoked(uint256 indexed id, address indexed signer, uint256 approvals);
    event ProposalCancelled(uint256 indexed id);
    event ProposalExecuted(uint256 indexed id);

    error NotSigner();
    error NotGovernance();
    error InvalidThreshold();
    error AlreadySigner();
    error UnknownSigner();
    error UnknownProposal();
    error AlreadyApproved();
    error NotApproved();
    error ProposalClosed();
    error ThresholdNotMet();
    error ExecutionFailed();
    error EmptyCall();

    modifier onlySigner() {
        if (!isSigner[msg.sender]) revert NotSigner();
        _;
    }

    /// @notice Reachable only via `execute()`, i.e. only with threshold approvals.
    modifier onlyGovernance() {
        if (msg.sender != address(this)) revert NotGovernance();
        _;
    }

    constructor(address[] memory initialSigners, uint256 initialThreshold) {
        uint256 n = initialSigners.length;
        if (initialThreshold == 0 || initialThreshold > n) revert InvalidThreshold();
        for (uint256 i = 0; i < n; i++) {
            address s = initialSigners[i];
            if (s == address(0)) revert UnknownSigner();
            if (isSigner[s]) revert AlreadySigner();
            isSigner[s] = true;
            _signers.push(s);
            emit SignerAdded(s);
        }
        threshold = initialThreshold;
        emit ThresholdUpdated(initialThreshold);
    }

    // ---------------------------------------------------------------- reads

    function signers() external view returns (address[] memory) {
        return _signers;
    }

    function signerCount() external view returns (uint256) {
        return _signers.length;
    }

    function proposalCount() external view returns (uint256) {
        return _proposals.length;
    }

    function getProposal(uint256 id)
        external
        view
        returns (bytes memory data, uint256 approvals, uint256 createdAt, bool executed, bool cancelled)
    {
        if (id >= _proposals.length) revert UnknownProposal();
        Proposal storage p = _proposals[id];
        return (p.data, p.approvals, p.createdAt, p.executed, p.cancelled);
    }

    // ------------------------------------------------------------ proposals

    /// @notice Create a proposal. The proposer's approval is recorded immediately.
    /// @param data ABI-encoded call against this contract (e.g. abi.encodeCall(...)).
    function propose(bytes calldata data) external onlySigner returns (uint256 id) {
        if (data.length == 0) revert EmptyCall();
        id = _proposals.length;
        Proposal storage p = _proposals.push();
        p.data = data;
        p.createdAt = block.timestamp;
        emit ProposalCreated(id, msg.sender, data);

        hasApproved[id][msg.sender] = true;
        p.approvals = 1;
        emit ProposalApproved(id, msg.sender, 1);
    }

    function approve(uint256 id) external onlySigner {
        Proposal storage p = _open(id);
        if (hasApproved[id][msg.sender]) revert AlreadyApproved();
        hasApproved[id][msg.sender] = true;
        p.approvals += 1;
        emit ProposalApproved(id, msg.sender, p.approvals);
    }

    function revokeApproval(uint256 id) external onlySigner {
        Proposal storage p = _open(id);
        if (!hasApproved[id][msg.sender]) revert NotApproved();
        hasApproved[id][msg.sender] = false;
        p.approvals -= 1;
        emit ProposalRevoked(id, msg.sender, p.approvals);
    }

    function cancelProposal(uint256 id) external onlySigner {
        Proposal storage p = _open(id);
        p.cancelled = true;
        emit ProposalCancelled(id);
    }

    /// @notice Execute once `threshold` distinct signers have approved.
    /// @dev Marks executed BEFORE the self-call, so a reentrant `execute(id)`
    ///      hits `ProposalClosed`.
    function execute(uint256 id) external onlySigner {
        Proposal storage p = _open(id);
        if (p.approvals < threshold) revert ThresholdNotMet();
        p.executed = true;
        (bool ok, ) = address(this).call(p.data);
        if (!ok) revert ExecutionFailed();
        emit ProposalExecuted(id);
    }

    function _open(uint256 id) private view returns (Proposal storage p) {
        if (id >= _proposals.length) revert UnknownProposal();
        p = _proposals[id];
        if (p.executed || p.cancelled) revert ProposalClosed();
    }

    // ------------------------------------------- signer set (self-governed)

    /// @notice Add a signer. Requires threshold approvals.
    function addSigner(address signer) external onlyGovernance {
        if (signer == address(0)) revert UnknownSigner();
        if (isSigner[signer]) revert AlreadySigner();
        isSigner[signer] = true;
        _signers.push(signer);
        emit SignerAdded(signer);
    }

    /// @notice Remove a signer. Requires threshold approvals. Cannot drop the
    ///         signer count below the current threshold.
    function removeSigner(address signer) external onlyGovernance {
        if (!isSigner[signer]) revert UnknownSigner();
        if (_signers.length - 1 < threshold) revert InvalidThreshold();
        isSigner[signer] = false;
        uint256 n = _signers.length;
        for (uint256 i = 0; i < n; i++) {
            if (_signers[i] == signer) {
                _signers[i] = _signers[n - 1];
                _signers.pop();
                break;
            }
        }
        emit SignerRemoved(signer);
    }

    /// @notice Change the threshold. Requires threshold approvals under the
    ///         CURRENT threshold.
    function setThreshold(uint256 newThreshold) external onlyGovernance {
        if (newThreshold == 0 || newThreshold > _signers.length) revert InvalidThreshold();
        threshold = newThreshold;
        emit ThresholdUpdated(newThreshold);
    }
}
