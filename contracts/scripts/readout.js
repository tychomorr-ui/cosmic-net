// Read live state of a deployed TruthCoin. Uses address from deployed.json.
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deployed = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployed.json"), "utf8")
  );
  const c = await hre.ethers.getContractAt("TruthCoin", deployed.address);
  console.log("address    :", deployed.address);
  console.log("name       :", await c.name());
  console.log("symbol     :", await c.symbol());
  console.log("decimals   :", (await c.decimals()).toString());
  console.log("totalSupply:", (await c.totalSupply()).toString());
  console.log("transfers  :", await c.transfersEnabled());
  console.log("manifesto  :", await c.MANIFESTO_HASH());
  console.log("owner      :", await c.owner());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
