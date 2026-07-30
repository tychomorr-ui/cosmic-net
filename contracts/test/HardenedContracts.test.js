const { expect } = require("chai");
const { ethers } = require("hardhat");

// Regression suite for the three pre-audit blockers plus the individual
// findings raised in the review of the submitted drafts.
//
// B1 — threshold governance is real (not "any single signer")
// B2 — two-step ownership, renounce disabled
// D1..D7, K1..K6 — see docs/CONTRACT-REVIEW notes

describe("SovereignOwnable (via DigitalOre)", () => {
  let ore, owner, alice, bob, carol;

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();
    const Ore = await ethers.getContractFactory("DigitalOre");
    ore = await Ore.deploy([owner.address, alice.address, bob.address], 2);
  });

  it("B2: ownership transfer is two-step and the nominee holds nothing until accept", async () => {
    await ore.transferOwnership(carol.address);
    expect(await ore.owner()).to.equal(owner.address);
    expect(await ore.pendingOwner()).to.equal(carol.address);

    await expect(ore.connect(carol).mint(carol.address, 1n)).to.be.revertedWithCustomError(ore, "NotOwner");

    await ore.connect(carol).acceptOwnership();
    expect(await ore.owner()).to.equal(carol.address);
    expect(await ore.pendingOwner()).to.equal(ethers.ZeroAddress);
  });

  it("B2: a non-nominee cannot hijack the handoff", async () => {
    await ore.transferOwnership(carol.address);
    await expect(ore.connect(alice).acceptOwnership()).to.be.revertedWithCustomError(ore, "NotPendingOwner");
  });

  it("B2: the old owner loses authority after accept", async () => {
    await ore.transferOwnership(carol.address);
    await ore.connect(carol).acceptOwnership();
    await expect(ore.mint(owner.address, 1n)).to.be.revertedWithCustomError(ore, "NotOwner");
  });

  it("B2: renounceOwnership always reverts", async () => {
    await expect(ore.renounceOwnership()).to.be.revertedWithCustomError(ore, "RenounceDisabled");
  });

  it("B2: ownership cannot be sent to the zero address", async () => {
    await expect(ore.transferOwnership(ethers.ZeroAddress)).to.be.revertedWithCustomError(ore, "ZeroAddress");
  });

  it("a nomination can be cancelled", async () => {
    await ore.transferOwnership(carol.address);
    await ore.cancelOwnershipTransfer();
    await expect(ore.connect(carol).acceptOwnership()).to.be.revertedWithCustomError(ore, "NotPendingOwner");
  });
});

describe("MultiSigGoverned (via DigitalOre)", () => {
  let ore, owner, alice, bob, mallory;
  const CAP = 50_000n * 10n ** 18n;

  const encodeCap = (v) => ore.interface.encodeFunctionData("updateMintCap", [v]);

  beforeEach(async () => {
    [owner, alice, bob, mallory] = await ethers.getSigners();
    const Ore = await ethers.getContractFactory("DigitalOre");
    ore = await Ore.deploy([owner.address, alice.address, bob.address], 2);
  });

  it("B1: one signer alone cannot change a governed parameter", async () => {
    const before = await ore.mintCapPerPeriod();
    await ore.propose(encodeCap(CAP)); // proposer auto-approves => 1 of 2
    await expect(ore.execute(0)).to.be.revertedWithCustomError(ore, "ThresholdNotMet");
    expect(await ore.mintCapPerPeriod()).to.equal(before);
  });

  it("B1: a governed function cannot be called directly, even by the owner", async () => {
    await expect(ore.updateMintCap(CAP)).to.be.revertedWithCustomError(ore, "NotGovernance");
  });

  it("B1: threshold approvals do change the parameter", async () => {
    await ore.propose(encodeCap(CAP));
    await ore.connect(alice).approve(0);
    await ore.execute(0);
    expect(await ore.mintCapPerPeriod()).to.equal(CAP);
  });

  it("B1: the same signer cannot approve twice to fake a threshold", async () => {
    await ore.propose(encodeCap(CAP));
    await expect(ore.approve(0)).to.be.revertedWithCustomError(ore, "AlreadyApproved");
  });

  it("B1: a non-signer can neither propose nor approve", async () => {
    await expect(ore.connect(mallory).propose(encodeCap(CAP))).to.be.revertedWithCustomError(ore, "NotSigner");
    await ore.propose(encodeCap(CAP));
    await expect(ore.connect(mallory).approve(0)).to.be.revertedWithCustomError(ore, "NotSigner");
  });

  it("a revoked approval drops the count back below threshold", async () => {
    await ore.propose(encodeCap(CAP));
    await ore.connect(alice).approve(0);
    await ore.connect(alice).revokeApproval(0);
    await expect(ore.execute(0)).to.be.revertedWithCustomError(ore, "ThresholdNotMet");
  });

  it("a proposal cannot be executed twice", async () => {
    await ore.propose(encodeCap(CAP));
    await ore.connect(alice).approve(0);
    await ore.execute(0);
    await expect(ore.execute(0)).to.be.revertedWithCustomError(ore, "ProposalClosed");
  });

  it("a cancelled proposal cannot execute", async () => {
    await ore.propose(encodeCap(CAP));
    await ore.connect(alice).approve(0);
    await ore.cancelProposal(0);
    await expect(ore.execute(0)).to.be.revertedWithCustomError(ore, "ProposalClosed");
  });

  it("the signer set is itself threshold-governed", async () => {
    const data = ore.interface.encodeFunctionData("addSigner", [mallory.address]);
    await ore.propose(data);
    await expect(ore.execute(0)).to.be.revertedWithCustomError(ore, "ThresholdNotMet");
    await ore.connect(alice).approve(0);
    await ore.execute(0);
    expect(await ore.isSigner(mallory.address)).to.equal(true);
    expect(await ore.signerCount()).to.equal(4n);
  });

  it("signers cannot be reduced below the threshold", async () => {
    const remove = (a) => ore.interface.encodeFunctionData("removeSigner", [a]);
    await ore.propose(remove(bob.address));
    await ore.connect(alice).approve(0);
    await ore.execute(0);
    expect(await ore.signerCount()).to.equal(2n);

    await ore.propose(remove(alice.address));
    await ore.connect(alice).approve(1);
    await expect(ore.execute(1)).to.be.revertedWithCustomError(ore, "ExecutionFailed");
  });

  it("deployment rejects a threshold larger than the signer set", async () => {
    const Ore = await ethers.getContractFactory("DigitalOre");
    await expect(Ore.deploy([owner.address], 2)).to.be.revertedWithCustomError(Ore, "InvalidThreshold");
  });
});

describe("DigitalOre", () => {
  let ore, owner, alice, bob;
  const ONE = 10n ** 18n;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const Ore = await ethers.getContractFactory("DigitalOre");
    ore = await Ore.deploy([owner.address, alice.address, bob.address], 2);
  });

  it("D1: the rate-limit window is denominated in seconds, matching the timestamp check", async () => {
    // default ~11.5 days
    expect(await ore.periodDurationSeconds()).to.equal(993_600n);

    await ore.mint(alice.address, 100_000n * ONE);
    await expect(ore.mint(alice.address, ONE)).to.be.revertedWithCustomError(ore, "ExceedsPeriodCap");

    await ethers.provider.send("evm_increaseTime", [993_600]);
    await ethers.provider.send("evm_mine", []);
    await ore.mint(alice.address, ONE); // window rolled
  });

  it("D1: governance cannot collapse the window to defeat the cap", async () => {
    const data = ore.interface.encodeFunctionData("updatePeriodDuration", [1]);
    await ore.propose(data);
    await ore.connect(alice).approve(0);
    await expect(ore.execute(0)).to.be.revertedWithCustomError(ore, "ExecutionFailed");
  });

  it("D1: governance cannot raise the period cap above MAX_SUPPLY", async () => {
    const max = await ore.MAX_SUPPLY();
    const data = ore.interface.encodeFunctionData("updateMintCap", [max + 1n]);
    await ore.propose(data);
    await ore.connect(alice).approve(0);
    await expect(ore.execute(0)).to.be.revertedWithCustomError(ore, "ExecutionFailed");
  });

  it("D1: MAX_SUPPLY is an absolute ceiling", async () => {
    const max = await ore.MAX_SUPPLY();
    const bump = ore.interface.encodeFunctionData("updateMintCap", [max]);
    await ore.propose(bump);
    await ore.connect(alice).approve(0);
    await ore.execute(0);

    await ore.mint(alice.address, max);
    await expect(ore.mint(alice.address, 1n)).to.be.revertedWithCustomError(ore, "ExceedsMaxSupply");
  });

  it("D2: the same history slice cannot be paid twice", async () => {
    await ore.refineByproduct(alice.address, 50, 50, 50, 50, "a");
    await ore.accrueDividend(alice.address, 1_000_000n, 100);
    const first = await ore.dividendAccrued(alice.address);
    expect(first).to.be.greaterThan(0n);

    await expect(ore.accrueDividend(alice.address, 1_000_000n, 100)).to.be.revertedWithCustomError(
      ore,
      "NothingToClaim",
    );
    expect(await ore.dividendAccrued(alice.address)).to.equal(first);
  });

  it("D2: the cursor advances only over unprocessed records", async () => {
    await ore.refineByproduct(alice.address, 50, 50, 50, 50, "a");
    await ore.accrueDividend(alice.address, 1_000_000n, 100);
    const afterFirst = await ore.dividendAccrued(alice.address);

    await ore.refineByproduct(alice.address, 50, 50, 50, 50, "b");
    await ore.accrueDividend(alice.address, 1_000_000n, 100);
    expect(await ore.dividendAccrued(alice.address)).to.equal(afterFirst * 2n);
    expect(await ore.dividendCursor(alice.address)).to.equal(2n);
  });

  it("D3: accrued dividends are redeemable for DOU", async () => {
    await ore.refineByproduct(alice.address, 50, 50, 50, 50, "a");
    await ore.accrueDividend(alice.address, 1_000_000n, 100);

    const claimable = await ore.claimableDividend(alice.address);
    expect(claimable).to.be.greaterThan(0n);

    await ore.connect(alice).claimDividend();
    expect(await ore.balanceOf(alice.address)).to.equal(claimable);
    expect(await ore.claimableDividend(alice.address)).to.equal(0n);
    await expect(ore.connect(alice).claimDividend()).to.be.revertedWithCustomError(ore, "NothingToClaim");
  });

  it("D3: redemption respects the same supply ceiling as owner minting", async () => {
    expect(await ore.MAX_SUPPLY()).to.equal(1_000_000n * ONE);
  });

  it("D4: modest scores no longer truncate to a zero grade", async () => {
    await ore.refineByproduct(alice.address, 30, 30, 30, 30, "modest");
    const page = await ore.getByproductHistory(0, 10);
    expect(page[0].grade).to.equal((30n * 30n * 30n * 30n) / 100n);
    expect(page[0].grade).to.be.greaterThan(0n);
  });

  it("D4: a grade that truly rounds to zero reverts rather than recording silently", async () => {
    await expect(ore.refineByproduct(alice.address, 1, 1, 1, 1, "dust")).to.be.revertedWithCustomError(
      ore,
      "GradeRoundsToZero",
    );
  });

  it("D4: scores above 100 are rejected", async () => {
    await expect(ore.refineByproduct(alice.address, 101, 50, 50, 50, "x")).to.be.revertedWithCustomError(
      ore,
      "InvalidScores",
    );
  });

  it("D5: soulbound applies to the owner too", async () => {
    await ore.mint(owner.address, 10n * ONE);
    await expect(ore.transfer(alice.address, ONE)).to.be.revertedWithCustomError(ore, "Soulbound");
  });

  it("D5: enableTransfers is owner-gated and one-way", async () => {
    await ore.mint(alice.address, 10n * ONE);
    await expect(ore.connect(alice).enableTransfers()).to.be.revertedWithCustomError(ore, "NotOwner");

    await ore.enableTransfers();
    expect(await ore.transfersEnabled()).to.equal(true);
    await ore.connect(alice).transfer(bob.address, ONE);
    expect(await ore.balanceOf(bob.address)).to.equal(ONE);

    // no re-lock path exists
    expect(ore.interface.fragments.some((f) => f.name === "disableTransfers")).to.equal(false);
  });

  it("D6: approve reverts while locked, so no unusable allowance is observable", async () => {
    await expect(ore.connect(alice).approve(bob.address, ONE)).to.be.revertedWithCustomError(ore, "Soulbound");
    await ore.enableTransfers();
    await ore.connect(alice).approve(bob.address, ONE);
    expect(await ore.allowance(alice.address, bob.address)).to.equal(ONE);
  });

  it("D7: paginated history returns an empty page instead of reverting when empty", async () => {
    expect(await ore.getByproductHistoryLength()).to.equal(0n);
    expect(await ore.getByproductHistory(0, 10)).to.deep.equal([]);
    await expect(ore.getByproductHistory(0, 0)).to.be.revertedWithCustomError(ore, "InvalidPage");
    await expect(ore.getByproductHistory(0, 101)).to.be.revertedWithCustomError(ore, "InvalidPage");
  });

  it("refinement and minting are owner-only", async () => {
    await expect(
      ore.connect(alice).refineByproduct(alice.address, 50, 50, 50, 50, "x"),
    ).to.be.revertedWithCustomError(ore, "NotOwner");
    await expect(ore.connect(alice).mint(alice.address, ONE)).to.be.revertedWithCustomError(ore, "NotOwner");
  });

  it("the running total matches the sum of recorded grades", async () => {
    await ore.refineByproduct(alice.address, 40, 40, 40, 40, "a");
    await ore.refineByproduct(bob.address, 60, 60, 60, 60, "b");
    const expected = (40n ** 4n) / 100n + (60n ** 4n) / 100n;
    expect(await ore.getTotalByproductRefined()).to.equal(expected);
  });
});

describe("KetherGateRegistry", () => {
  let reg, owner, alice, bob;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const Reg = await ethers.getContractFactory("KetherGateRegistry");
    reg = await Reg.deploy([owner.address, alice.address, bob.address], 2);
  });

  const register = (who, name) =>
    reg.connect(who).registerIdentity(name, "Nexinus RI Systems", "operator", ["probe"]);

  it("K1: case variants collide instead of registering separately", async () => {
    await register(alice, "NEXINUS");
    await expect(register(bob, "nexinus")).to.be.revertedWithCustomError(reg, "NameTaken");
    await expect(register(bob, "NeXiNuS")).to.be.revertedWithCustomError(reg, "NameTaken");
  });

  it("K1: whitespace and non-ASCII homoglyphs are rejected outright", async () => {
    await expect(register(alice, "NEXINUS ")).to.be.revertedWithCustomError(reg, "NameInvalidCharacter");
    await expect(register(alice, " nexinus")).to.be.revertedWithCustomError(reg, "NameInvalidCharacter");
    // Cyrillic 'е' (U+0435) in place of ASCII 'e'
    await expect(register(alice, "n\u0435xinus")).to.be.revertedWithCustomError(reg, "NameInvalidCharacter");
  });

  it("K1: names are length-bounded", async () => {
    await expect(register(alice, "ab")).to.be.revertedWithCustomError(reg, "NameTooShort");
    await expect(register(alice, "a".repeat(33))).to.be.revertedWithCustomError(reg, "NameTooLong");
  });

  it("K1: normalizeName folds case deterministically", async () => {
    expect(await reg.normalizeName("NEXINUS")).to.equal(await reg.normalizeName("nexinus"));
    expect(await reg.normalizeName("nexinus")).to.not.equal(await reg.normalizeName("nexinus1"));
  });

  it("K2: entity reads are paginated and bounded", async () => {
    await register(alice, "alpha-node");
    await register(bob, "beta_node");
    expect(await reg.getRegisteredEntitiesCount()).to.equal(2n);
    expect(await reg.getRegisteredEntities(0, 1)).to.deep.equal([alice.address]);
    expect(await reg.getRegisteredEntities(5, 10)).to.deep.equal([]);
    await expect(reg.getRegisteredEntities(0, 101)).to.be.revertedWithCustomError(reg, "InvalidPage");
    // the unbounded full-array getter must not exist
    expect(reg.interface.fragments.some((f) => f.name === "getRegisteredEntities" && f.inputs.length === 0)).to.equal(
      false,
    );
  });

  it("K2: capability lists and text fields are bounded", async () => {
    const many = Array.from({ length: 17 }, (_, i) => `c${i}`);
    await expect(
      reg.connect(alice).registerIdentity("alpha-node", "org", "role", many),
    ).to.be.revertedWithCustomError(reg, "TooManyCapabilities");
    await expect(
      reg.connect(alice).registerIdentity("alpha-node", "o".repeat(129), "role", []),
    ).to.be.revertedWithCustomError(reg, "TextTooLong");
  });

  it("K3: an identity can be deregistered and the name reused", async () => {
    await register(alice, "alpha-node");
    await reg.connect(alice).deregisterIdentity();
    expect(await reg.getRegisteredEntitiesCount()).to.equal(0n);
    expect(await reg.isNameAvailable("alpha-node")).to.equal(true);
    await register(bob, "ALPHA-NODE");
    expect(await reg.getRegisteredEntitiesCount()).to.equal(1n);
  });

  it("K3: swap-and-pop keeps the index consistent for the moved entity", async () => {
    await register(alice, "alpha-node");
    await register(bob, "beta-node");
    await reg.connect(alice).deregisterIdentity();
    expect(await reg.getRegisteredEntities(0, 10)).to.deep.equal([bob.address]);
    await reg.connect(bob).deregisterIdentity();
    expect(await reg.getRegisteredEntitiesCount()).to.equal(0n);
  });

  it("K3: an identity can be updated, which clears any prior anchor claim", async () => {
    await register(alice, "alpha-node");
    await reg.attestClaim(alice.address, ethers.id("manifesto"), 959472);
    expect((await reg.getIdentity(alice.address)).attested).to.equal(true);

    await reg.connect(alice).updateIdentity("New Org", "auditor", ["verify"]);
    const id = await reg.getIdentity(alice.address);
    expect(id.attested).to.equal(false);
    expect(id.claimedBitcoinBlockHeight).to.equal(0n);
    expect(id.organization).to.equal("New Org");
  });

  it("K4: the anchor record is named as a claim, not a verification", async () => {
    const names = reg.interface.fragments.filter((f) => f.type === "function").map((f) => f.name);
    expect(names).to.include("attestClaim");
    expect(names).to.not.include("verifyIdentity");
    await register(alice, "alpha-node");
    await reg.attestClaim(alice.address, ethers.id("manifesto"), 959472);
    expect(await reg.claimedAttestations(ethers.id("manifesto"))).to.equal(959472n);
  });

  it("K4: only the owner can record a claim, and only for a registered entity", async () => {
    await register(alice, "alpha-node");
    await expect(
      reg.connect(bob).attestClaim(alice.address, ethers.id("m"), 1),
    ).to.be.revertedWithCustomError(reg, "NotOwner");
    await expect(reg.attestClaim(bob.address, ethers.id("m"), 1)).to.be.revertedWithCustomError(
      reg,
      "NotRegistered",
    );
  });

  it("K5: re-anchoring a hash to a different height reverts instead of overwriting", async () => {
    await register(alice, "alpha-node");
    await register(bob, "beta-node");
    const h = ethers.id("manifesto");
    await reg.attestClaim(alice.address, h, 959472);
    await expect(reg.attestClaim(bob.address, h, 111111)).to.be.revertedWithCustomError(
      reg,
      "ConflictingAttestation",
    );
    // same height is idempotent
    await reg.attestClaim(bob.address, h, 959472);
    expect(await reg.claimedAttestations(h)).to.equal(959472n);
  });

  it("K6: the threshold is enforced for registry governance too", async () => {
    const data = reg.interface.encodeFunctionData("setThreshold", [3]);
    await reg.propose(data);
    await expect(reg.execute(0)).to.be.revertedWithCustomError(reg, "ThresholdNotMet");
    await reg.connect(alice).approve(0);
    await reg.execute(0);
    expect(await reg.threshold()).to.equal(3n);
  });

  it("one address may hold only one identity", async () => {
    await register(alice, "alpha-node");
    await expect(register(alice, "other-node")).to.be.revertedWithCustomError(reg, "AlreadyRegistered");
  });

  it("stance commitment requires registration", async () => {
    await expect(
      reg.connect(alice).commitSovereignStance(true, true, true, true, true),
    ).to.be.revertedWithCustomError(reg, "NotRegistered");

    await register(alice, "alpha-node");
    await reg.connect(alice).commitSovereignStance(true, true, true, true, true);
    const stance = await reg.getSovereignStance(alice.address);
    expect(stance.zeroTelemetry).to.equal(true);
    expect(stance.committedAt).to.be.greaterThan(0n);
  });

  it("lookup by name is case-insensitive and reverts when unknown", async () => {
    await register(alice, "alpha-node");
    expect((await reg.getIdentityByName("ALPHA-NODE")).entityAddress).to.equal(alice.address);
    await expect(reg.getIdentityByName("no-such-node")).to.be.revertedWithCustomError(reg, "NotRegistered");
  });
});
