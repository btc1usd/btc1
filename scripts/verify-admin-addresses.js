const { ethers } = require("hardhat");

async function main() {
  console.log("=== VERIFYING ADMIN ADDRESSES ON ALL CONTRACTS ===\n");

  // Expected admin address
  const EXPECTED_ADMIN = "0x6210FfE7340dC47d5DA4b888e850c036CC6ee835";
  
  // Load deployment info
  const fs = require("fs");
  let deploymentInfo;
  try {
    const deploymentData = fs.readFileSync("deployment-base-mainnet.json", "utf8");
    deploymentInfo = JSON.parse(deploymentData);
  } catch (error) {
    throw new Error("Could not load deployment-base-mainnet.json");
  }

  console.log("Expected Admin Address:", EXPECTED_ADMIN);
  console.log("Compromised Deployer:", deploymentInfo.deployer);
  console.log("\n" + "=".repeat(80) + "\n");

  let allSecure = true;
  const issues = [];

  // Helper function to check admin
  async function checkAdmin(contractName, address, method = "admin") {
    try {
      const contract = await ethers.getContractAt(
        method === "owner" ? 
          ["function owner() view returns (address)"] : 
          ["function admin() view returns (address)"],
        address
      );
      
      const actualAdmin = method === "owner" ? 
        await contract.owner() : 
        await contract.admin();
      
      const isSecure = actualAdmin.toLowerCase() === EXPECTED_ADMIN.toLowerCase();
      const isCompromised = actualAdmin.toLowerCase() === deploymentInfo.deployer.toLowerCase();
      
      console.log(`📋 ${contractName}`);
      console.log(`   Address: ${address}`);
      console.log(`   ${method}(): ${actualAdmin}`);
      
      if (isSecure) {
        console.log(`   ✅ SECURE - Admin is correct\n`);
      } else if (isCompromised) {
        console.log(`   ❌ COMPROMISED - Admin is the compromised deployer!\n`);
        allSecure = false;
        issues.push(`${contractName}: Admin is compromised deployer`);
      } else {
        console.log(`   ⚠️  WARNING - Admin is unexpected address\n`);
        allSecure = false;
        issues.push(`${contractName}: Admin is unexpected (${actualAdmin})`);
      }
      
      return { contractName, actualAdmin, isSecure, isCompromised };
    } catch (error) {
      console.log(`📋 ${contractName}`);
      console.log(`   Address: ${address}`);
      console.log(`   ❌ ERROR: ${error.message}\n`);
      allSecure = false;
      issues.push(`${contractName}: Error checking admin - ${error.message}`);
      return { contractName, actualAdmin: null, isSecure: false, error: error.message };
    }
  }

  // Helper function to check emergency council
  async function checkEmergencyCouncil(address) {
    try {
      const contract = await ethers.getContractAt(
        ["function emergencyCouncil() view returns (address)"],
        address
      );
      
      const actualCouncil = await contract.emergencyCouncil();
      const isCompromised = actualCouncil.toLowerCase() === deploymentInfo.deployer.toLowerCase();
      
      console.log(`📋 ProtocolGovernance - Emergency Council`);
      console.log(`   Address: ${address}`);
      console.log(`   emergencyCouncil(): ${actualCouncil}`);
      
      if (isCompromised) {
        console.log(`   ⚠️  WARNING - Emergency Council is compromised deployer`);
        console.log(`   ℹ️  This should be updated using update-emergency-council.js\n`);
        issues.push("ProtocolGovernance: Emergency Council is compromised deployer (needs update)");
        return { isCompromised: true, actualCouncil };
      } else {
        console.log(`   ✅ SECURE - Emergency Council is not the deployer\n`);
        return { isCompromised: false, actualCouncil };
      }
    } catch (error) {
      console.log(`📋 ProtocolGovernance - Emergency Council`);
      console.log(`   ❌ ERROR: ${error.message}\n`);
      issues.push(`Emergency Council: Error checking - ${error.message}`);
      return { isCompromised: null, error: error.message };
    }
  }

  console.log("🔍 CHECKING CORE CONTRACTS\n");
  console.log("=".repeat(80) + "\n");
  
  // Check core contracts (use admin() method)
  const coreContracts = [
    { name: "BTC1USD Token", address: deploymentInfo.core.btc1usd },
    { name: "Vault", address: deploymentInfo.core.vault },
    { name: "ChainlinkBTCOracle", address: deploymentInfo.core.chainlinkBTCOracle },
  ];

  const coreResults = [];
  for (const contract of coreContracts) {
    const result = await checkAdmin(contract.name, contract.address, "admin");
    coreResults.push(result);
  }

  console.log("\n🔍 CHECKING DISTRIBUTION CONTRACTS\n");
  console.log("=".repeat(80) + "\n");
  
  const distributionContracts = [
    { name: "MerkleDistributor", address: deploymentInfo.distribution.merkleDistributor },
    { name: "WeeklyDistribution", address: deploymentInfo.distribution.weeklyDistribution },
  ];

  const distributionResults = [];
  for (const contract of distributionContracts) {
    const result = await checkAdmin(contract.name, contract.address, "admin");
    distributionResults.push(result);
  }

  console.log("\n🔍 CHECKING GOVERNANCE CONTRACTS\n");
  console.log("=".repeat(80) + "\n");
  
  const governanceContracts = [
    { name: "EndowmentManager", address: deploymentInfo.governance.endowmentManager },
    { name: "ProtocolGovernance", address: deploymentInfo.governance.protocolGovernance },
  ];

  const governanceResults = [];
  for (const contract of governanceContracts) {
    const result = await checkAdmin(contract.name, contract.address, "admin");
    governanceResults.push(result);
  }

  // Check emergency council
  const councilResult = await checkEmergencyCouncil(deploymentInfo.governance.protocolGovernance);

  console.log("\n🔍 CHECKING WALLET CONTRACTS (Ownable)\n");
  console.log("=".repeat(80) + "\n");
  
  const walletContracts = [
    { name: "DevWallet", address: deploymentInfo.wallets.devWallet },
    { name: "EndowmentWallet", address: deploymentInfo.wallets.endowmentWallet },
    { name: "MerkleFeeCollector", address: deploymentInfo.wallets.merklFeeCollector },
  ];

  const walletResults = [];
  for (const contract of walletContracts) {
    const result = await checkAdmin(contract.name, contract.address, "owner");
    walletResults.push(result);
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 SECURITY VERIFICATION SUMMARY");
  console.log("=".repeat(80) + "\n");

  const totalContracts = coreResults.length + distributionResults.length + 
                        governanceResults.length + walletResults.length;
  const secureContracts = [...coreResults, ...distributionResults, 
                          ...governanceResults, ...walletResults]
                          .filter(r => r.isSecure).length;
  const compromisedContracts = [...coreResults, ...distributionResults, 
                               ...governanceResults, ...walletResults]
                               .filter(r => r.isCompromised).length;

  console.log(`Total Contracts Checked: ${totalContracts}`);
  console.log(`✅ Secure Contracts: ${secureContracts}`);
  console.log(`❌ Compromised Contracts: ${compromisedContracts}`);
  console.log(`⚠️  Emergency Council: ${councilResult.isCompromised ? 'NEEDS UPDATE' : 'SECURE'}`);

  console.log("\n" + "-".repeat(80) + "\n");

  if (allSecure && !councilResult.isCompromised) {
    console.log("🎉 ALL CONTRACTS ARE FULLY SECURE!");
    console.log("\n✅ All admin/owner addresses are set to:", EXPECTED_ADMIN);
    console.log("✅ Emergency Council is not the compromised deployer");
    console.log("✅ Compromised deployer has NO control over any contracts");
    console.log("\n🔒 Your protocol is 100% secure from the compromised deployer key!");
  } else if (allSecure && councilResult.isCompromised) {
    console.log("✅ CONTRACTS ARE SECURE (Admin/Owner addresses correct)");
    console.log("\n⚠️  REMAINING ISSUE:");
    console.log("   Emergency Council is still set to compromised deployer");
    console.log("\n📝 ACTION REQUIRED:");
    console.log("   Run: npx hardhat run scripts/update-emergency-council.js --network base-mainnet");
    console.log("   (Use ADMIN_PRIVATE_KEY for 0x6210FfE7340dC47d5DA4b888e850c036CC6ee835)");
    console.log("\n🔒 Once updated, your protocol will be 100% secure!");
  } else {
    console.log("❌ SECURITY ISSUES DETECTED!");
    console.log("\n⚠️  Issues found:");
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log("\n🚨 CRITICAL: Some contracts may still be controlled by compromised deployer!");
    console.log("   Please investigate and resolve these issues immediately.");
  }

  console.log("\n" + "=".repeat(80));

  // Return results for testing
  return {
    allSecure,
    totalContracts,
    secureContracts,
    compromisedContracts,
    emergencyCouncilCompromised: councilResult.isCompromised,
    issues,
    expectedAdmin: EXPECTED_ADMIN,
    deployer: deploymentInfo.deployer
  };
}

main()
  .then(() => {
    console.log("\n✅ Verification completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exitCode = 1;
  });
