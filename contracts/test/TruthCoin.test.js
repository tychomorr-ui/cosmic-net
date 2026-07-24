// Local Hardhat sanity tests — proves the contract compiles and its
// invariants hold BEFORE you spend testnet ETH. Run: npx hardhat test
const { expect } = require("chai");
const { ethers } = require("hardhat");

const MANIFESTO =
  "0x4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7";

describe("TruthCoin", () => {
  it("deploys with zero supply, disabled transfers, and the pinned manifesto hash", async () => {
    const [owner] = await ethers.getSigners();
    const C = await ethers.getContractFactory("TruthCoin");
    const c = await C.deploy();
    await c.waitForDeployment();

    expect(await c.name()).to.equal("Truth Coin");
    expect(await c.symbol()).to.equal("TRC");
    expect(await c.decimals()).to.equal(18);
    expect(await c.totalSupply()).to.equal(0n);
    expect(await c.transfersEnabled()).to.equal(false);
    expect(await c.owner()).to.equal(owner.address);
    expect(await c.MANIFESTO_HASH()).to.equal(MANIFESTO);
  });

  it("mints dignity credits and emits reason", async () => {
    const [owner, alice] = await ethers.getSigners();
    const c = await (await ethers.getContractFactory("TruthCoin")).deploy();
    await c.waitForDeployment();
    const amt = ethers.parseUnits("50000", 18);
    await expect(c.issueDignityCredit(alice.address, amt, "5yr survival"))
      .to.emit(c, "DignityCredit")
      .withArgs(alice.address, amt, "5yr survival");
    expect(await c.balanceOf(alice.address)).to.equal(amt);
    expect(await c.totalSupply()).to.equal(amt);
  });

  it("rejects transfers while soulbound", async () => {
    const [owner, alice, bob] = await ethers.getSigners();
    const c = await (await ethers.getContractFactory("TruthCoin")).deploy();
    await c.waitForDeployment();
    await c.issueDignityCredit(alice.address, 100n, "seed");
    await expect(c.connect(alice).transfer(bob.address, 1n)).to.be.revertedWith(
      "soulbound: transfers disabled"
    );
  });

  it("allows transfers only after enableTransfers()", async () => {
    const [owner, alice, bob] = await ethers.getSigners();
    const c = await (await ethers.getContractFactory("TruthCoin")).deploy();
    await c.waitForDeployment();
    await c.issueDignityCredit(alice.address, 100n, "seed");
    await c.enableTransfers();
    await c.connect(alice).transfer(bob.address, 40n);
    expect(await c.balanceOf(bob.address)).to.equal(40n);
  });

  it("only owner can mint", async () => {
    const [_o, alice] = await ethers.getSigners();
    const c = await (await ethers.getContractFactory("TruthCoin")).deploy();
    await c.waitForDeployment();
    await expect(
      c.connect(alice).issueDignityCredit(alice.address, 1n, "x")
    ).to.be.revertedWith("not owner");
  });

  it("hands ownership over in two steps and only to the nominee", async () => {
    const [owner, multisig, mallory] = await ethers.getSigners();
    const c = await (await ethers.getContractFactory("TruthCoin")).deploy();
    await c.waitForDeployment();

    await expect(c.connect(mallory).transferOwnership(mallory.address)).to.be.revertedWith(
      "not owner"
    );
    await expect(c.transferOwnership(ethers.ZeroAddress)).to.be.revertedWith("zero addr");

    await expect(c.transferOwnership(multisig.address))
      .to.emit(c, "OwnershipTransferStarted")
      .withArgs(owner.address, multisig.address);

    // nothing changes until the nominee proves it can sign
    expect(await c.owner()).to.equal(owner.address);
    expect(await c.pendingOwner()).to.equal(multisig.address);
    await expect(c.connect(mallory).acceptOwnership()).to.be.revertedWith("not pending owner");

    await expect(c.connect(multisig).acceptOwnership())
      .to.emit(c, "OwnershipTransferred")
      .withArgs(owner.address, multisig.address);

    expect(await c.owner()).to.equal(multisig.address);
    expect(await c.pendingOwner()).to.equal(ethers.ZeroAddress);

    // the old key is fully demoted
    await expect(c.issueDignityCredit(owner.address, 1n, "x")).to.be.revertedWith("not owner");
    await c.connect(multisig).issueDignityCredit(owner.address, 1n, "post-handoff");
    expect(await c.totalSupply()).to.equal(1n);
  });
});
