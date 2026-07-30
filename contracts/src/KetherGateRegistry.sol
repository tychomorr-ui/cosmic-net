// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SovereignOwnable.sol";
import "./MultiSigGoverned.sol";

/**
 * @title KetherGateRegistry
 * @notice Sovereign identity registration with normalised unique names and
 *         owner-recorded external anchor CLAIMS.
 *
 * Doctrine note on naming — this contract cannot see the Bitcoin chain, so it
 * cannot verify that a manifesto hash was anchored at a given height. It
 * records what the owner ASSERTS. Everything here is therefore named as a
 * claim: `attestClaim`, `claimedBitcoinBlockHeight`, `ClaimAttested`. Real
 * verification happens off-chain against the OpenTimestamps receipt. Calling a
 * stored assertion "verified" would be exactly the theater this project rejects.
 *
 * Changes from the pre-audit draft, each closing a finding:
 *  - Two-step ownership via SovereignOwnable; renounce reverts.       (B2)
 *  - Real M-of-N threshold governance via MultiSigGoverned.           (B1, K6)
 *  - Names are normalised and charset-restricted before hashing, so
 *    case and homoglyph variants cannot be used to impersonate.       (K1)
 *  - Registration is bounded (name length, capability count/length)
 *    and every array read is paginated.                               (K2)
 *  - Identities can be updated and deregistered; the name is released
 *    and `entityIndex` is genuinely used for swap-and-pop removal.    (K3)
 *  - verifyIdentity renamed to attestClaim and re-labelled throughout. (K4)
 *  - Re-anchoring a hash to a DIFFERENT height reverts instead of
 *    silently overwriting the earlier record.                         (K5)
 */
contract KetherGateRegistry is SovereignOwnable, MultiSigGoverned {
    // ============================================================ constants

    uint256 public constant MIN_NAME_LENGTH = 3;
    uint256 public constant MAX_NAME_LENGTH = 32;
    uint256 public constant MAX_TEXT_LENGTH = 128;
    uint256 public constant MAX_CAPABILITIES = 16;
    uint256 public constant MAX_PAGE = 100;

    // ================================================================ types

    struct Identity {
        address entityAddress;
        string name;
        /// @dev Normalised form actually used for uniqueness.
        bytes32 nameHash;
        string organization;
        string sovereignRole;
        /// @dev Owner-asserted manifesto hash. NOT verified on-chain.
        bytes32 claimedManifestHash;
        /// @dev Owner-asserted Bitcoin block height. NOT verified on-chain.
        uint256 claimedBitcoinBlockHeight;
        uint256 registeredAt;
        /// @dev True once the owner has recorded a claim. Means "claim on
        ///      record", never "independently verified".
        bool attested;
        string[] capabilities;
    }

    struct SovereignStance {
        bool zeroTelemetry;
        bool zeroVendorMiddleware;
        bool localFirst;
        bool operatorOwnership;
        bool realDataOrHonestStandby;
        uint256 committedAt;
    }

    // ================================================================ state

    mapping(address => Identity) private _identities;

    /// @notice normalised name hash => entity address.
    mapping(bytes32 => address) public nameRegistry;

    address[] private _registeredEntities;

    /// @notice entity => index into _registeredEntities. Valid only while registered.
    mapping(address => uint256) private _entityIndex;

    mapping(address => SovereignStance) private _sovereignStances;

    /// @notice claimed manifest hash => claimed Bitcoin block height.
    mapping(bytes32 => uint256) public claimedAttestations;

    // =============================================================== events

    event IdentityRegistered(address indexed entity, bytes32 indexed nameHash, string name, uint256 timestamp);
    event IdentityUpdated(address indexed entity, string organization, string sovereignRole);
    event IdentityDeregistered(address indexed entity, bytes32 indexed nameHash);
    event ClaimAttested(
        address indexed entity,
        bytes32 indexed claimedManifestHash,
        uint256 claimedBitcoinBlockHeight,
        uint256 timestamp
    );
    event SovereignStanceCommitted(address indexed entity, uint256 timestamp);

    // =============================================================== errors

    error NameRequired();
    error NameTooShort();
    error NameTooLong();
    error NameInvalidCharacter();
    error NameTaken();
    error TextTooLong();
    error TooManyCapabilities();
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidClaimHash();
    error InvalidBlockHeight();
    error ConflictingAttestation();
    error InvalidPage();

    // ========================================================== constructor

    constructor(address[] memory initialSigners, uint256 initialThreshold)
        SovereignOwnable(msg.sender)
        MultiSigGoverned(initialSigners, initialThreshold)
    {}

    modifier registered(address entity) {
        if (_identities[entity].entityAddress == address(0)) revert NotRegistered();
        _;
    }

    // ================================================ name normalisation

    /**
     * @notice Normalise a name to its uniqueness key.
     * @dev Rejects anything outside a strict ASCII charset before lowercasing.
     *      This is what stops "NEXINUS" / "nexinus" / "NEXINUS " / Cyrillic
     *      homoglyphs from registering as distinct identities: non-ASCII bytes
     *      revert outright, and case is folded, so exactly one canonical form
     *      of any acceptable name can exist.
     *      Allowed: a-z, A-Z, 0-9, '-', '_'. No spaces, no leading/trailing
     *      whitespace possible, no Unicode.
     */
    function normalizeName(string memory name) public pure returns (bytes32) {
        bytes memory b = bytes(name);
        uint256 len = b.length;
        if (len == 0) revert NameRequired();
        if (len < MIN_NAME_LENGTH) revert NameTooShort();
        if (len > MAX_NAME_LENGTH) revert NameTooLong();

        bytes memory out = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 0x41 && c <= 0x5A) {
                out[i] = bytes1(c + 32); // A-Z -> a-z
            } else if ((c >= 0x61 && c <= 0x7A) || (c >= 0x30 && c <= 0x39) || c == 0x2D || c == 0x5F) {
                out[i] = bytes1(c); // a-z, 0-9, '-', '_'
            } else {
                revert NameInvalidCharacter();
            }
        }
        return keccak256(out);
    }

    function isNameAvailable(string calldata name) external view returns (bool) {
        return nameRegistry[normalizeName(name)] == address(0);
    }

    // ================================================ identity registration

    function registerIdentity(
        string calldata name,
        string calldata organization,
        string calldata sovereignRole,
        string[] calldata capabilities
    ) external {
        if (_identities[msg.sender].entityAddress != address(0)) revert AlreadyRegistered();
        if (bytes(organization).length == 0) revert NameRequired();
        _checkText(organization);
        _checkText(sovereignRole);
        _checkCapabilities(capabilities);

        bytes32 nameHash = normalizeName(name);
        if (nameRegistry[nameHash] != address(0)) revert NameTaken();

        Identity storage id = _identities[msg.sender];
        id.entityAddress = msg.sender;
        id.name = name;
        id.nameHash = nameHash;
        id.organization = organization;
        id.sovereignRole = sovereignRole;
        id.registeredAt = block.timestamp;
        for (uint256 i = 0; i < capabilities.length; i++) {
            id.capabilities.push(capabilities[i]);
        }

        nameRegistry[nameHash] = msg.sender;
        _entityIndex[msg.sender] = _registeredEntities.length;
        _registeredEntities.push(msg.sender);

        emit IdentityRegistered(msg.sender, nameHash, name, block.timestamp);
    }

    /// @notice Update mutable identity fields. The name is immutable; release it
    ///         by deregistering.
    function updateIdentity(
        string calldata organization,
        string calldata sovereignRole,
        string[] calldata capabilities
    ) external registered(msg.sender) {
        if (bytes(organization).length == 0) revert NameRequired();
        _checkText(organization);
        _checkText(sovereignRole);
        _checkCapabilities(capabilities);

        Identity storage id = _identities[msg.sender];
        id.organization = organization;
        id.sovereignRole = sovereignRole;
        delete id.capabilities;
        for (uint256 i = 0; i < capabilities.length; i++) {
            id.capabilities.push(capabilities[i]);
        }
        // A changed identity invalidates any prior anchor claim about it.
        id.attested = false;
        id.claimedManifestHash = bytes32(0);
        id.claimedBitcoinBlockHeight = 0;

        emit IdentityUpdated(msg.sender, organization, sovereignRole);
    }

    /// @notice Remove your identity and release the name for reuse.
    /// @dev Swap-and-pop using `_entityIndex`, which the draft stored but never
    ///      read. Historical `claimedAttestations` entries are intentionally
    ///      retained: the anchor record is append-only.
    function deregisterIdentity() external registered(msg.sender) {
        bytes32 nameHash = _identities[msg.sender].nameHash;

        uint256 idx = _entityIndex[msg.sender];
        uint256 last = _registeredEntities.length - 1;
        if (idx != last) {
            address moved = _registeredEntities[last];
            _registeredEntities[idx] = moved;
            _entityIndex[moved] = idx;
        }
        _registeredEntities.pop();

        delete _entityIndex[msg.sender];
        delete nameRegistry[nameHash];
        delete _identities[msg.sender];
        delete _sovereignStances[msg.sender];

        emit IdentityDeregistered(msg.sender, nameHash);
    }

    // =========================================================== claim record

    /**
     * @notice Record the owner's ASSERTION that an entity's manifesto hash is
     *         anchored at a given Bitcoin height.
     * @dev This performs no verification and cannot. A consumer must check the
     *      OpenTimestamps receipt for `claimedManifestHash` independently.
     *      Re-recording the same hash at a DIFFERENT height reverts, so the
     *      anchor record cannot be silently rewritten.
     */
    function attestClaim(address entity, bytes32 claimedManifestHash, uint256 claimedBitcoinBlockHeight)
        external
        onlyOwner
        registered(entity)
    {
        if (claimedManifestHash == bytes32(0)) revert InvalidClaimHash();
        if (claimedBitcoinBlockHeight == 0) revert InvalidBlockHeight();

        uint256 existing = claimedAttestations[claimedManifestHash];
        if (existing != 0 && existing != claimedBitcoinBlockHeight) revert ConflictingAttestation();

        Identity storage id = _identities[entity];
        id.claimedManifestHash = claimedManifestHash;
        id.claimedBitcoinBlockHeight = claimedBitcoinBlockHeight;
        id.attested = true;

        claimedAttestations[claimedManifestHash] = claimedBitcoinBlockHeight;

        emit ClaimAttested(entity, claimedManifestHash, claimedBitcoinBlockHeight, block.timestamp);
    }

    function getClaimedAttestation(bytes32 claimedManifestHash) external view returns (uint256) {
        return claimedAttestations[claimedManifestHash];
    }

    // ===================================================== sovereign stance

    function commitSovereignStance(
        bool zeroTelemetry,
        bool zeroVendorMiddleware,
        bool localFirst,
        bool operatorOwnership,
        bool realDataOrHonestStandby
    ) external registered(msg.sender) {
        _sovereignStances[msg.sender] = SovereignStance({
            zeroTelemetry: zeroTelemetry,
            zeroVendorMiddleware: zeroVendorMiddleware,
            localFirst: localFirst,
            operatorOwnership: operatorOwnership,
            realDataOrHonestStandby: realDataOrHonestStandby,
            committedAt: block.timestamp
        });
        emit SovereignStanceCommitted(msg.sender, block.timestamp);
    }

    function getSovereignStance(address entity)
        external
        view
        registered(entity)
        returns (SovereignStance memory)
    {
        return _sovereignStances[entity];
    }

    // ================================================================ reads

    function getIdentity(address entity) external view registered(entity) returns (Identity memory) {
        return _identities[entity];
    }

    function getIdentityByName(string calldata name) external view returns (Identity memory) {
        address entity = nameRegistry[normalizeName(name)];
        if (entity == address(0)) revert NotRegistered();
        return _identities[entity];
    }

    function getRegisteredEntitiesCount() external view returns (uint256) {
        return _registeredEntities.length;
    }

    /// @notice Paginated. The draft's unbounded `getRegisteredEntities()` is
    ///         deliberately absent — permissionless registration makes a
    ///         full-array read a denial-of-service vector for every consumer.
    function getRegisteredEntities(uint256 start, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        if (limit == 0 || limit > MAX_PAGE) revert InvalidPage();
        uint256 len = _registeredEntities.length;
        if (start >= len) return new address[](0);

        uint256 end = start + limit > len ? len : start + limit;
        page = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = _registeredEntities[i];
        }
    }

    // ============================================================== helpers

    function _checkText(string calldata text) private pure {
        if (bytes(text).length > MAX_TEXT_LENGTH) revert TextTooLong();
    }

    function _checkCapabilities(string[] calldata capabilities) private pure {
        if (capabilities.length > MAX_CAPABILITIES) revert TooManyCapabilities();
        for (uint256 i = 0; i < capabilities.length; i++) {
            if (bytes(capabilities[i]).length > MAX_TEXT_LENGTH) revert TextTooLong();
        }
    }
}
