const hre = require("hardhat");

async function main() {
  const expectedAdmin = "0x6210FfE7340dC47d5DA4b888e850c036CC6ee835";

  // Contract addresses from deployment-base-sepolia.json
  const contracts = {
    btc1usd: "0x20DD4275a2721EBC641a4844E0415A651D249973",
    vault: "0x383ABAA34022d2CE3F4dB1992354E7f7D82FAd8C",
    protocolGovernance: "0xc70387B464E6679417Afabc486a96793336f33Fe",
    weeklyDistribution: "0xeb3Ba7C7838F38D92659CCD879D2865E26EAa46f",
    merkleDistributor: "0xFC39C0db5f8DFC6f59AB420A53c3fB44A5C70ad1",
    endowmentManager: "0xE7574904BfBa0aA58AEdB925dA3744361697a95A"
  };

  console.log("\n========================================");
  console.log("ADMIN VERIFICATION REPORT");
  console.log("========================================");
  console.log(`Expected Admin: ${expectedAdmin}\n`);

  let allCorrect = true;

  for (const [name, address] of Object.entries(contracts)) {
    try {
      const contract = await hre.ethers.getContractAt(
        name === "btc1usd" ? "BTC1USD" :
        name === "vault" ? "Vault" :
        name === "protocolGovernance" ? "ProtocolGovernance" :
        name === "weeklyDistribution" ? "WeeklyDistribution" :
        name === "merkleDistributor" ? "MerkleDistributor" :
        "EndowmentManager",
        address
      );

      const currentAdmin = await contract.admin();
      const isCorrect = currentAdmin.toLowerCase() === expectedAdmin.toLowerCase();

      console.log(`${name}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Current Admin: ${currentAdmin}`);
      console.log(`  Status: ${isCorrect ? "✅ CORRECT" : "❌ INCORRECT"}`);
      console.log();

      if (!isCorrect) {
        allCorrect = false;
      }
    } catch (error) {
      console.log(`${name}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Error: ${error.message}`);
      console.log();
      allCorrect = false;
    }
  }

  console.log("========================================");
  if (allCorrect) {
    console.log("✅ All contracts have the correct admin!");
  } else {
    console.log("❌ Some contracts have incorrect admin addresses!");
    console.log("\nTo fix, run: npx hardhat run scripts/transfer-admin.js --network base-sepolia");
  }
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
