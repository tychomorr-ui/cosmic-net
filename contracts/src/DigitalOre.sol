// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./SovereignOwnable.sol";
import "./MultiSigGoverned.sol";

/**
 * @title DigitalOre (DOU)
 * @notice Soulbound ERC-20 recording refined intellectual byproduct and the
 *         dividend credits it earns.
 *
 * Doctrine posture: this contract mints only by explicit owner action or by an
 * operator redeeming credit that was already accrued from recorded byproduct.
 * There is no autonomous, metric-driven, or scheduled mint path.
 *
 * Changes from the pre-audit draft, each closing a finding:
 *  - Two-step ownership via SovereignOwnable; renounce reverts.       (B2)
 *  - Real M-of-N threshold governance via MultiSigGoverned.           (B1)
 *  - Mint rate limit is denominated in SECONDS, matching the
 *    block.timestamp comparison, and bounded so governance cannot
 *    collapse the window or raise the cap above MAX_SUPPLY.           (D1)
 *  - Dividend accrual advances a per-operator cursor, so a range can
 *    never be paid twice, and the rate is applied per matching record. (D2)
 *  - Accrued dividends are redeemable via claimDividend().            (D3)
 *  - Grade is scaled to 1e6 so ordinary inputs no longer truncate to
 *    zero, and a zero grade reverts instead of recording silently.    (D4)
 *  - Soulbound is symmetric with a one-way enableTransfers() unlock;
 *    the owner holds no transfer privilege others lack.               (D5)
 *  - approve() reverts while transfers are locked, so no unusable
 *    allowance can be observed by an integrator.                      (D6)
 *  - Paginated reads return an empty page instead of reverting.       (D7)
 */
contract DigitalOre is ERC20, SovereignOwnable, MultiSigGoverned, ReentrancyGuard {
    // ============================================================ constants

    /// @notice Hard ceiling on total supply. Not governable.
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;

    /// @notice Grade is reported on a 0 .. 1e6 scale.
    uint256 public constant GRADE_SCALE = 1_000_000;

    /// @notice Dividend rate applied per matching byproduct record, in
    ///         millionths (1000 / 1e6 = 0.1%). Not governable.
    uint256 public constant DIVIDEND_RATE_PPM = 1000;

    /// @notice Guard rails on the governable rate limit.
    uint256 public constant MIN_PERIOD_SECONDS = 1 hours;
    uint256 public constant MAX_PERIOD_SECONDS = 365 days;

    /// @notice Cap on records processed in one paginated call.
    uint256 public constant MAX_PAGE = 100;

    // ================================================================ state

    /// @notice Running total of all grades recorded. O(1) read.
    uint256 public totalByproductAccrued;

    /// @notice Mint allowance per rolling period.
    uint256 public mintCapPerPeriod = 100_000 * 10 ** 18;

    /// @notice Length of the rolling period, in SECONDS (default ~11.5 days).
    uint256 public periodDurationSeconds = 993_600;

    /// @notice Start timestamp of the current period.
    uint256 public periodStartedAt;

    /// @notice Amount minted so far in the current period.
    uint256 public currentPeriodMinted;

    /// @notice One-way soulbound unlock. False means no holder may transfer.
    bool public transfersEnabled;

    struct ByproductRecord {
        address operator;
        uint256 grade;
        uint256 timestamp;
        string description;
    }

    ByproductRecord[] private _byproductHistory;

    /// @notice Total dividend credit ever accrued to an operator.
    mapping(address => uint256) public dividendAccrued;

    /// @notice Portion of that credit already redeemed for DOU.
    mapping(address => uint256) public dividendClaimed;

    /// @notice Next unprocessed history index per operator. Prevents replay.
    mapping(address => uint256) public dividendCursor;

    // =============================================================== events

    event ByproductRefined(address indexed operator, uint256 grade, uint256 timestamp, string description);
    event DividendAccrued(address indexed operator, uint256 amount, uint256 newCursor);
    event DividendClaimed(address indexed operator, uint256 amount);
    event MintCapUpdated(uint256 newCap);
    event PeriodDurationUpdated(uint256 newDurationSeconds);
    event PeriodRolled(uint256 startedAt);
    event TransfersEnabled();

    // =============================================================== errors

    error InvalidOperator();
    error InvalidScores();
    error GradeRoundsToZero();
    error InvalidAmount();
    error InvalidPage();
    error ExceedsMaxSupply();
    error ExceedsPeriodCap();
    error InvalidCap();
    error InvalidDuration();
    error NothingToClaim();
    error Soulbound();

    // ========================================================== constructor

    /// @param initialSigners Governance signer set (e.g. three Safe owners).
    /// @param initialThreshold Approvals required, e.g. 2 for 2-of-3.
    constructor(address[] memory initialSigners, uint256 initialThreshold)
        ERC20("Digital Ore", "DOU")
        SovereignOwnable(msg.sender)
        MultiSigGoverned(initialSigners, initialThreshold)
    {
        periodStartedAt = block.timestamp;
        emit PeriodRolled(block.timestamp);
    }

    /// @dev Rolls the rate-limit window forward if it has elapsed.
    modifier rollPeriod() {
        if (block.timestamp >= periodStartedAt + periodDurationSeconds) {
            periodStartedAt = block.timestamp;
            currentPeriodMinted = 0;
            emit PeriodRolled(block.timestamp);
        }
        _;
    }

    // ================================================= byproduct refinement

    /// @notice Record refined byproduct for an operator.
    /// @dev grade = n*d*s*t scaled to 0..GRADE_SCALE. All four scores are 0..100,
    ///      so the product is at most 1e8 and the division by 100 is exact at the
    ///      top of the range. A grade that rounds to zero reverts rather than
    ///      recording a meaningless entry.
    function refineByproduct(
        address operator,
        uint256 novelty,
        uint256 density,
        uint256 sigilWeight,
        uint256 sourceTrust,
        string calldata description
    ) external onlyOwner {
        if (operator == address(0)) revert InvalidOperator();
        if (novelty > 100 || density > 100 || sigilWeight > 100 || sourceTrust > 100) revert InvalidScores();

        uint256 grade = (novelty * density * sigilWeight * sourceTrust) / 100;
        if (grade == 0) revert GradeRoundsToZero();

        _byproductHistory.push(
            ByproductRecord({
                operator: operator,
                grade: grade,
                timestamp: block.timestamp,
                description: description
            })
        );
        totalByproductAccrued += grade;

        emit ByproductRefined(operator, grade, block.timestamp, description);
    }

    function getTotalByproductRefined() external view returns (uint256) {
        return totalByproductAccrued;
    }

    function getByproductHistoryLength() external view returns (uint256) {
        return _byproductHistory.length;
    }

    /// @notice Paginated history read. Returns an empty page past the end
    ///         instead of reverting, so a fresh deployment is readable.
    function getByproductHistory(uint256 start, uint256 limit)
        external
        view
        returns (ByproductRecord[] memory page)
    {
        if (limit == 0 || limit > MAX_PAGE) revert InvalidPage();
        uint256 len = _byproductHistory.length;
        if (start >= len) return new ByproductRecord[](0);

        uint256 end = start + limit > len ? len : start + limit;
        page = new ByproductRecord[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = _byproductHistory[i];
        }
    }

    // ==================================================== dividend accrual

    /// @notice Accrue dividend credit for an operator over the next unprocessed
    ///         slice of history.
    /// @dev The starting index is the stored cursor, not a caller argument, so
    ///      the same records can never be paid twice regardless of call order or
    ///      repetition. The cursor always advances, so repeated calls terminate.
    function accrueDividend(address operator, uint256 derivativeValue, uint256 limit) external onlyOwner {
        if (operator == address(0)) revert InvalidOperator();
        if (derivativeValue == 0) revert InvalidAmount();
        if (limit == 0 || limit > MAX_PAGE) revert InvalidPage();

        uint256 len = _byproductHistory.length;
        uint256 start = dividendCursor[operator];
        if (start >= len) revert NothingToClaim();

        uint256 end = start + limit > len ? len : start + limit;
        uint256 perRecord = (derivativeValue * DIVIDEND_RATE_PPM) / 1_000_000;

        uint256 total;
        for (uint256 i = start; i < end; i++) {
            if (_byproductHistory[i].operator == operator) {
                total += perRecord;
            }
        }

        dividendCursor[operator] = end;
        if (total > 0) {
            dividendAccrued[operator] += total;
        }
        emit DividendAccrued(operator, total, end);
    }

    /// @notice Unredeemed dividend credit for an operator.
    function claimableDividend(address operator) public view returns (uint256) {
        return dividendAccrued[operator] - dividendClaimed[operator];
    }

    /// @notice Redeem accrued dividend credit for DOU.
    /// @dev Subject to the same supply ceiling and rate limit as owner minting,
    ///      so redemption cannot be used to bypass either.
    function claimDividend() external rollPeriod nonReentrant returns (uint256 amount) {
        amount = claimableDividend(msg.sender);
        if (amount == 0) revert NothingToClaim();
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        if (currentPeriodMinted + amount > mintCapPerPeriod) revert ExceedsPeriodCap();

        dividendClaimed[msg.sender] += amount;
        currentPeriodMinted += amount;
        _mint(msg.sender, amount);
        emit DividendClaimed(msg.sender, amount);
    }

    /// @dev Retained for interface compatibility with the pre-audit draft.
    function getDividendAccrual(address operator) external view returns (uint256) {
        return dividendAccrued[operator];
    }

    // ============================================================== minting

    /// @notice Owner mint, bounded by the absolute ceiling and the rolling cap.
    function mint(address to, uint256 amount) external onlyOwner rollPeriod {
        if (to == address(0)) revert InvalidOperator();
        if (amount == 0) revert InvalidAmount();
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        if (currentPeriodMinted + amount > mintCapPerPeriod) revert ExceedsPeriodCap();

        currentPeriodMinted += amount;
        _mint(to, amount);
    }

    // =========================================== governed parameter changes

    /// @notice Requires threshold approvals. Cannot exceed MAX_SUPPLY, so the
    ///         rate limit can never be widened into irrelevance in one step.
    function updateMintCap(uint256 newCap) external onlyGovernance {
        if (newCap == 0 || newCap > MAX_SUPPLY) revert InvalidCap();
        mintCapPerPeriod = newCap;
        emit MintCapUpdated(newCap);
    }

    /// @notice Requires threshold approvals. Bounded so governance cannot
    ///         collapse the window to a single second and defeat the cap.
    function updatePeriodDuration(uint256 newDurationSeconds) external onlyGovernance {
        if (newDurationSeconds < MIN_PERIOD_SECONDS || newDurationSeconds > MAX_PERIOD_SECONDS) {
            revert InvalidDuration();
        }
        periodDurationSeconds = newDurationSeconds;
        emit PeriodDurationUpdated(newDurationSeconds);
    }

    // =================================================== transfer semantics

    /// @notice One-way unlock. Once enabled, transfers cannot be re-locked.
    function enableTransfers() external onlyOwner {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (!transfersEnabled) revert Soulbound();
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (!transfersEnabled) revert Soulbound();
        return super.transferFrom(from, to, amount);
    }

    /// @dev Reverts while locked so integrators cannot observe an allowance
    ///      that no transfer could ever spend.
    function approve(address spender, uint256 amount) public override returns (bool) {
        if (!transfersEnabled) revert Soulbound();
        return super.approve(spender, amount);
    }
}
