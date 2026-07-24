// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Truth Coin (TRC) — testnet doctrine token
/// @notice Non-transferable dignity-credit ledger. Owner mints; holders cannot transfer.
///         This is a TESTNET contract. No security, no legal tender, no investment.
///         Anchored to Bitcoin block 954181 · manifesto hash
///         0x4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7
contract TruthCoin {
    string public constant name     = "Truth Coin";
    string public constant symbol   = "TRC";
    uint8  public constant decimals = 18;

    bytes32 public constant MANIFESTO_HASH =
        0x4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7;

    uint256 public totalSupply;
    address public owner;
    address public pendingOwner; // two-step handoff target (multisig)
    bool    public transfersEnabled; // stays false on testnet — soulbound dignity credit

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event DignityCredit(address indexed recipient, uint256 amount, string reason);
    event TransfersEnabled();
    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Step 1 of the sovereignty handoff. Owner nominates a multisig.
    ///         Nothing changes until the nominee calls acceptOwnership().
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Step 2. Only the nominee can complete the handoff — this proves
    ///         the multisig can actually sign, so ownership cannot be burned by typo.
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "not pending owner");
        address prev = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(prev, owner);
    }


    /// @notice Mint dignity credits to a recipient with an on-chain reason string.
    function issueDignityCredit(address to, uint256 amount, string calldata reason) external onlyOwner {
        require(to != address(0), "zero addr");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit DignityCredit(to, amount, reason);
        emit Transfer(address(0), to, amount);
    }

    /// @notice One-way switch. Once transfers are enabled they cannot be disabled.
    function enableTransfers() external onlyOwner {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(transfersEnabled, "soulbound: transfers disabled");
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(transfersEnabled, "soulbound: transfers disabled");
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "zero addr");
        uint256 b = balanceOf[from];
        require(b >= amount, "balance");
        unchecked { balanceOf[from] = b - amount; }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
