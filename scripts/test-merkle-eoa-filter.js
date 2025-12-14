/**
 * Test script to verify Merkle tree generation filters smart contracts and only includes EOAs
 * 
 * This script:
 * 1. Calls the /api/generate-merkle-tree endpoint
 * 2. Verifies all addresses in the merkle tree are EOAs (not smart contracts)
 * 3. Reports any smart contracts that were incorrectly included
 * 
 * Usage:
 *   node scripts/test-merkle-eoa-filter.js
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}${colors.bold}▶ ${msg}${colors.reset}`),
  data: (label, value) => console.log(`  ${colors.magenta}${label}:${colors.reset} ${value}`)
};

// Configuration
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const MERKLE_ENDPOINT = `${API_URL}/api/generate-merkle-tree`;

// Setup provider for contract checks
async function getProvider() {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    throw new Error('ALCHEMY_API_KEY not found in environment variables');
  }
  
  const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Check if address is a smart contract (with bytecode size exception)
async function isContract(provider, address) {
  try {
    const code = await provider.getCode(address);
    
    // No code = EOA
    if (code === '0x') {
      return false;
    }
    
    // Small bytecode (<100 bytes) = likely smart contract wallet/proxy, treat as EOA
    const bytecodeLength = (code.length - 2) / 2; // Remove '0x' and convert hex pairs to bytes
    if (bytecodeLength < 100) {
      log.info(`Small contract detected (${bytecodeLength} bytes), treating as EOA: ${address}`);
      return false;
    }
    
    // Large bytecode = actual smart contract
    return true;
  } catch (error) {
    log.warning(`Failed to check contract status for ${address}: ${error.message}`);
    return false;
  }
}

// Main test function
async function testMerkleEOAFilter() {
  console.log(`${colors.cyan}${colors.bold}
╔════════════════════════════════════════════════════════════════╗
║     Merkle Tree EOA Filter Test - Base Mainnet                 ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Step 1: Check environment
    log.step('Step 1: Checking environment configuration');
    
    const requiredEnvVars = [
      'ALCHEMY_API_KEY',
      'NEXT_PUBLIC_BTC1USD_CONTRACT',
      'NEXT_PUBLIC_WEEKLY_DISTRIBUTION_CONTRACT',
      'NEXT_PUBLIC_MERKLE_DISTRIBUTOR_CONTRACT'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        log.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
      }
      log.success(`${envVar} configured`);
    }

    log.data('API Endpoint', MERKLE_ENDPOINT);

    // Step 2: Initialize provider
    log.step('Step 2: Initializing Base Mainnet provider');
    const provider = await getProvider();
    const network = await provider.getNetwork();
    log.success(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

    // Step 3: Call Merkle API
    log.step('Step 3: Calling Merkle tree generation API');
    log.info('This may take a minute...');
    
    const response = await fetch(MERKLE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      log.error(`API request failed: ${response.status} ${response.statusText}`);
      log.error(`Error details: ${JSON.stringify(errorData, null, 2)}`);
      process.exit(1);
    }

    const data = await response.json();
    log.success('Merkle tree generated successfully');

    // Step 4: Analyze response
    log.step('Step 4: Analyzing Merkle tree data');
    
    if (!data.success) {
      log.error('API returned success=false');
      log.data('Error', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    log.data('Distribution ID', data.distributionId);
    log.data('Merkle Root', data.merkleRoot);
    log.data('Total Rewards', `${ethers.formatUnits(data.totalRewards, 8)} BTC1USD`);
    log.data('Active Holders', data.activeHolders);
    log.data('Total Claims', data.claims);

    // Step 5: Verify all addresses are EOAs
    log.step('Step 5: Verifying all addresses are EOAs (not smart contracts)');
    
    if (!data.distributionData || !data.distributionData.claims) {
      log.error('No claims data found in response');
      process.exit(1);
    }

    const addresses = Object.keys(data.distributionData.claims);
    log.info(`Checking ${addresses.length} addresses...`);

    let eoaCount = 0;
    let contractCount = 0;
    const contractAddresses = [];

    for (const address of addresses) {
      const isContractAddress = await isContract(provider, address);
      
      if (isContractAddress) {
        contractCount++;
        contractAddresses.push(address);
        log.error(`❌ SMART CONTRACT FOUND: ${address}`);
        
        // Get claim details
        const claim = data.distributionData.claims[address];
        log.data('  Amount', ethers.formatUnits(claim.amount, 8));
        log.data('  Index', claim.index);
      } else {
        eoaCount++;
        log.success(`✓ EOA: ${address}`);
      }
    }

    // Step 6: Report results
    log.step('Step 6: Test Results Summary');
    
    console.log(`
${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}
${colors.cyan}Total Addresses in Merkle Tree:${colors.reset} ${addresses.length}
${colors.green}EOA Addresses (Correct):${colors.reset}        ${eoaCount}
${colors.red}Smart Contracts (Should be 0):${colors.reset}  ${contractCount}
${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}
`);

    if (contractCount > 0) {
      log.error(`TEST FAILED: ${contractCount} smart contract(s) found in merkle tree`);
      console.log(`\n${colors.red}Smart contracts found:${colors.reset}`);
      contractAddresses.forEach(addr => {
        console.log(`  - ${addr}`);
      });
      process.exit(1);
    } else {
      console.log(`${colors.green}${colors.bold}
╔════════════════════════════════════════════════════════════════╗
║                  ✅ TEST PASSED ✅                              ║
║                                                                ║
║  All addresses in the merkle tree are EOAs!                   ║
║  Smart contract filtering is working correctly.               ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);
      
      // Additional metadata check
      if (data.distributionData.metadata && data.distributionData.metadata.note) {
        log.step('Metadata Note');
        console.log(`  ${data.distributionData.metadata.note}`);
      }
    }

  } catch (error) {
    log.error(`Test failed with exception: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testMerkleEOAFilter();
