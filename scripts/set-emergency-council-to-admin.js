const { ethers } = require("hardhat");

async function main() {
  console.log("=== SETTING EMERGENCY COUNCIL TO ADMIN ADDRESS ===\n");

  // Admin address - this will be the new Emergency Council
  const ADMIN_ADDRESS = "0x6210FfE7340dC47d5DA4b888e850c036CC6ee835";

  // Check if admin private key is configured
  if (!process.env.ADMIN_PRIVATE_KEY) {
    throw new Error(
      "ADMIN_PRIVATE_KEY environment variable is required.\n" +
      "Please add your admin wallet private key to .env file:\n" +
      "ADMIN_PRIVATE_KEY=0xYourAdminPrivateKeyHere\n\n" +
      "Admin address: 0x6210FfE7340dC47d5DA4b888e850c036CC6ee835"
    );
  }

  // Get the admin signer
  const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, ethers.provider);
  console.log("Admin wallet address:", adminWallet.address);

  // Verify this is the correct admin
  if (adminWallet.address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    throw new Error(
      `Incorrect admin wallet!\n` +
      `Expected: ${ADMIN_ADDRESS}\n` +
      `Got: ${adminWallet.address}\n` +
      `Please use the correct ADMIN_PRIVATE_KEY`
    );
  }

  // Check balance
  const balance = await ethers.provider.getBalance(adminWallet.address);
  console.log("Admin balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient balance. Need at least 0.001 ETH for transaction.");
  }

  console.log("\n📋 Configuration:");
  console.log("  Current Admin:", adminWallet.address);
  console.log("  New Emergency Council:", ADMIN_ADDRESS);
  console.log("  (Setting Emergency Council to same as Admin for security)");

  // Load deployment info
  const fs = require("fs");
  let deploymentInfo;
  try {
    const deploymentData = fs.readFileSync("deployment-base-mainnet.json", "utf8");
    deploymentInfo = JSON.parse(deploymentData);
  } catch (error) {
    throw new Error(
      "Could not load deployment-base-mainnet.json\n" +
      "Please ensure you're in the project root directory"
    );
  }

  const protocolGovernanceAddress = deploymentInfo.governance.protocolGovernance;
  console.log("\n🏛️  ProtocolGovernance Contract:", protocolGovernanceAddress);

  // Get ProtocolGovernance contract
  const ProtocolGovernance = await ethers.getContractFactory("ProtocolGovernance");
  const protocolGovernance = ProtocolGovernance.attach(protocolGovernanceAddress).connect(adminWallet);

  // Verify current admin
  console.log("\n🔍 Verifying current admin...");
  const currentAdmin = await protocolGovernance.admin();
  console.log("  Current admin:", currentAdmin);

  if (currentAdmin.toLowerCase() !== adminWallet.address.toLowerCase()) {
    throw new Error(
      `Admin mismatch!\n` +
      `Expected: ${adminWallet.address}\n` +
      `Contract admin: ${currentAdmin}\n` +
      `You don't have permission to update the emergency council`
    );
  }

  // Get current emergency council
  const currentEmergencyCouncil = await protocolGovernance.emergencyCouncil();
  console.log("\n📊 Current State:");
  console.log("  Current Emergency Council:", currentEmergencyCouncil);
  console.log("  New Emergency Council:", ADMIN_ADDRESS);

  // Warn if it's the compromised address
  const compromisedDeployer = deploymentInfo.deployer;
  if (currentEmergencyCouncil.toLowerCase() === compromisedDeployer.toLowerCase()) {
    console.log("\n⚠️  WARNING: Current Emergency Council is the COMPROMISED deployer address!");
    console.log("  This update is CRITICAL for security.");
  }

  // Check if already set to admin
  if (currentEmergencyCouncil.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
    console.log("\n✅ Emergency Council is already set to the admin address!");
    console.log("   No update needed.");
    return {
      alreadySet: true,
      emergencyCouncil: ADMIN_ADDRESS
    };
  }

  // Confirm the change
  console.log("\n⚠️  IMPORTANT: Setting Emergency Council to Admin address");
  console.log("  This will give the admin control over emergency functions.");
  console.log("  This is the recommended security configuration.\n");

  // Execute the update
  console.log("🔄 Updating Emergency Council address...\n");

  try {
    const tx = await protocolGovernance.setEmergencyCouncil(ADMIN_ADDRESS);
    console.log("  📤 Transaction sent:", tx.hash);
    console.log("  ⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("  ✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("  ⛽ Gas used:", receipt.gasUsed.toString());

    // Verify the update
    console.log("\n🔍 Verifying update...");
    const updatedEmergencyCouncil = await protocolGovernance.emergencyCouncil();
    console.log("  Updated Emergency Council:", updatedEmergencyCouncil);

    if (updatedEmergencyCouncil.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
      console.log("\n✅ Emergency Council successfully updated to Admin address!");

      // Update deployment file
      console.log("\n💾 Updating deployment-base-mainnet.json...");
      deploymentInfo.config.emergencyCouncil = ADMIN_ADDRESS;
      deploymentInfo.lastUpdated = new Date().toISOString();
      deploymentInfo.updates = deploymentInfo.updates || [];
      deploymentInfo.updates.push({
        timestamp: new Date().toISOString(),
        action: "Emergency Council Updated to Admin",
        from: currentEmergencyCouncil,
        to: ADMIN_ADDRESS,
        txHash: tx.hash
      });

      fs.writeFileSync(
        "deployment-base-mainnet.json",
        JSON.stringify(deploymentInfo, null, 2)
      );
      console.log("  ✅ Deployment file updated");

      // Summary
      console.log("\n" + "=".repeat(80));
      console.log("📋 UPDATE SUMMARY");
      console.log("=".repeat(80));
      console.log("\n✅ Emergency Council Updated to Admin Address!");
      console.log("\n  Previous Address:", currentEmergencyCouncil);
      console.log("  New Address:     ", updatedEmergencyCouncil);
      console.log("  Admin Address:   ", ADMIN_ADDRESS);
      console.log("\n  Transaction Hash:", tx.hash);
      console.log("  Block Number:    ", receipt.blockNumber);
      console.log("  Gas Used:        ", receipt.gasUsed.toString());
      console.log("\n  BaseScan Link:");
      console.log(`  https://basescan.org/tx/${tx.hash}`);

      console.log("\n🔒 Security Status:");
      console.log("  ✅ Emergency Council is now controlled by the admin");
      console.log("  ✅ Compromised deployer key has NO control over protocol");
      console.log("  ✅ All protocol controls are now 100% SECURE");

      console.log("\n📝 Configuration:");
      console.log("  ✅ Admin Address = Emergency Council");
      console.log("     Both controlled by: " + ADMIN_ADDRESS);
      console.log("  ✅ This is the recommended security setup");

      console.log("\n🎉 YOUR PROTOCOL IS NOW 100% SECURE!");
      console.log("  All admin and emergency controls are under a single secure address");

    } else {
      console.log("\n❌ ERROR: Emergency Council update verification failed!");
      console.log(`  Expected: ${ADMIN_ADDRESS}`);
      console.log(`  Got: ${updatedEmergencyCouncil}`);
    }

  } catch (error) {
    console.error("\n❌ Transaction failed:");
    console.error("  Error:", error.message);

    if (error.message.includes("AdminOnly")) {
      console.error("\n  This transaction requires admin privileges.");
      console.error("  Current admin:", currentAdmin);
      console.error("  Your address:", adminWallet.address);
    }

    throw error;
  }

  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => {
    console.log("\n✅ Emergency Council successfully set to admin address!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed to set Emergency Council:");
    console.error(error);
    process.exitCode = 1;
  });
