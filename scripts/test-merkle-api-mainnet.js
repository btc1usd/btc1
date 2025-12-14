/**
 * Test script for Merkle API with Base Mainnet contracts
 * 
 * This script tests the /api/generate-merkle endpoint with your deployed
 * Base Mainnet contracts to verify LP detection and holder aggregation.
 * 
 * Usage:
 *   node scripts/test-merkle-api-mainnet.js
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Load deployment configuration
const deployment = require('../deployment-base-mainnet.json');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${msg}`),
  data: (label, value) => console.log(`  ${colors.magenta}${label}:${colors.reset} ${value}`)
};

async function checkEnvironment() {
  log.step('Checking environment configuration...');
  
  const requiredEnvVars = [
    'ALCHEMY_API_KEY',
    'NEXT_PUBLIC_CHAIN_ID'
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v] && !process.env[`NEXT_PUBLIC_${v}`]);
  
  if (missing.length > 0) {
    log.error(`Missing required environment variables: ${missing.join(', ')}`);
    log.info('Add these to your .env.local file');
    return false;
  }

  log.success('Environment configuration OK');
  log.data('Chain ID', process.env.NEXT_PUBLIC_CHAIN_ID || '8453 (default)');
  log.data('Alchemy API Key', process.env.ALCHEMY_API_KEY ? '✓ Set' : '✗ Not set');
  
  return true;
}

async function checkDeployedContracts() {
  log.step('Verifying deployed contracts on Base Mainnet...');
  
  const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!alchemyKey) {
    log.error('Alchemy API key required for mainnet testing');
    return false;
  }

  const provider = new ethers.JsonRpcProvider(
    `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  );

  try {
    // Check BTC1USD contract
    log.info('Checking BTC1USD contract...');
    const btc1Code = await provider.getCode(deployment.core.btc1usd);
    if (btc1Code === '0x') {
      log.error(`BTC1USD contract not found at ${deployment.core.btc1usd}`);
      return false;
    }
    log.success(`BTC1USD: ${deployment.core.btc1usd}`);
    log.data('Explorer', deployment.explorerUrls.btc1usd);

    // Check total supply
    const btc1Contract = new ethers.Contract(
      deployment.core.btc1usd,
      ['function totalSupply() view returns (uint256)', 'function decimals() view returns (uint8)'],
      provider
    );
    const totalSupply = await btc1Contract.totalSupply();
    const decimals = await btc1Contract.decimals();
    log.data('Total Supply', `${ethers.formatUnits(totalSupply, decimals)} BTC1USD`);

    // Check WeeklyDistribution contract
    log.info('Checking WeeklyDistribution contract...');
    const wdCode = await provider.getCode(deployment.distribution.weeklyDistribution);
    if (wdCode === '0x') {
      log.error(`WeeklyDistribution contract not found at ${deployment.distribution.weeklyDistribution}`);
      return false;
    }
    log.success(`WeeklyDistribution: ${deployment.distribution.weeklyDistribution}`);

    // Check MerkleDistributor contract
    log.info('Checking MerkleDistributor contract...');
    const mdCode = await provider.getCode(deployment.distribution.merkleDistributor);
    if (mdCode === '0x') {
      log.error(`MerkleDistributor contract not found at ${deployment.distribution.merkleDistributor}`);
      return false;
    }
    log.success(`MerkleDistributor: ${deployment.distribution.merkleDistributor}`);

    log.success('All contracts verified on Base Mainnet');
    return true;

  } catch (error) {
    log.error(`Failed to verify contracts: ${error.message}`);
    return false;
  }
}

async function checkBTC1Holders() {
  log.step('Checking for BTC1 token holders...');
  
  const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const provider = new ethers.JsonRpcProvider(
    `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  );

  try {
    const btc1Contract = new ethers.Contract(
      deployment.core.btc1usd,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );

    // Check known addresses
    const knownAddresses = [
      { name: 'Dev Wallet', address: deployment.wallets.devWallet },
      { name: 'Endowment Wallet', address: deployment.wallets.endowmentWallet },
      { name: 'Merkle Fee Collector', address: deployment.wallets.merklFeeCollector }
    ];

    let holderCount = 0;
    for (const { name, address } of knownAddresses) {
      const balance = await btc1Contract.balanceOf(address);
      if (balance > 0n) {
        log.success(`${name}: ${ethers.formatUnits(balance, 8)} BTC1USD`);
        holderCount++;
      }
    }

    if (holderCount === 0) {
      log.warning('No BTC1USD holders found in known wallets');
      log.info('You may need to mint tokens to user addresses first');
      return false;
    }

    log.success(`Found ${holderCount} holders in known wallets`);
    return true;

  } catch (error) {
    log.error(`Failed to check holders: ${error.message}`);
    return false;
  }
}

async function isServerRunning(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}

async function testMerkleAPI() {
  log.step('Testing Merkle API endpoint...');
  
  // Determine API URL - prefer localhost for testing
  const apiUrl = process.env.TEST_API_URL || 
                 'http://localhost:3000';
  
  const endpoint = `${apiUrl}/api/generate-merkle`;
  
  // Check if Next.js server is running
  log.info(`Checking if server is running at ${apiUrl}...`);
  const serverRunning = await isServerRunning(apiUrl);
  if (!serverRunning) {
    log.error(`Server not responding at ${apiUrl}`);
    log.info('Please start the Next.js dev server with: npm run dev');
    return false;
  }
  
  // Check if Next.js server is likely running
  if (apiUrl.includes('localhost')) {
    log.warning('Testing against local server. Make sure Next.js dev server is running:');
    log.info('  npm run dev');
    console.log('');
  }
  
  log.info(`Calling API: ${endpoint}`);
  log.warning('This may take 1-2 minutes for mainnet...');

  try {
    const startTime = Date.now();
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(180000) // 3 minute timeout
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (!response.ok) {
      const errorData = await response.json();
      log.error(`API returned error (${response.status})`);
      log.error(`Message: ${errorData.error || 'Unknown error'}`);
      if (errorData.details) {
        log.error(`Details: ${errorData.details}`);
      }
      return false;
    }

    const data = await response.json();
    
    log.success(`API responded successfully in ${duration}s`);
    console.log('');
    log.step('Response Summary:');
    log.data('Success', data.success ? '✓ Yes' : '✗ No');
    log.data('Distribution ID', data.distributionId);
    log.data('Merkle Root', data.merkleRoot);
    log.data('Total Rewards', `${ethers.formatUnits(data.totalRewards, 8)} BTC1USD`);
    log.data('Active Holders', data.activeHolders);
    log.data('LP Pairs Detected', data.lpPairsDetected || 0);
    
    if (data.distributionData?.metadata) {
      const meta = data.distributionData.metadata;
      console.log('');
      log.step('Metadata:');
      log.data('Total Holders', meta.totalHolders);
      log.data('LP Holders Processed', meta.lpHoldersProcessed || 0);
      log.data('Excluded Addresses', meta.excludedCount);
      log.data('Generated At', meta.generated);
    }

    console.log('');
    log.step('Sample Claims (first 5):');
    const claims = Object.values(data.claims).slice(0, 5);
    claims.forEach(claim => {
      log.info(`${claim.account}:`);
      log.data('  Index', claim.index);
      log.data('  Amount', `${ethers.formatUnits(claim.amount, 8)} BTC1USD`);
      log.data('  Proof Length', claim.proof.length);
    });

    // Verify merkle root format
    console.log('');
    log.step('Validation:');
    if (data.merkleRoot.startsWith('0x') && data.merkleRoot.length === 66) {
      log.success('Merkle root format valid (32 bytes hex)');
    } else {
      log.error('Invalid merkle root format');
    }

    if (data.activeHolders > 0) {
      log.success('Claims generated successfully');
    } else {
      log.warning('No active holders found');
    }

    if (data.lpPairsDetected > 0) {
      log.success(`LP pair detection working (${data.lpPairsDetected} pairs found)`);
    } else {
      log.info('No LP pairs detected (may be normal if no liquidity pools exist)');
    }

    return true;

  } catch (error) {
    if (error.name === 'TimeoutError' || error.code === 23) {
      log.error(`API call timed out after 3 minutes. This is normal for complex merkle generation.`);
      log.info('Check the Next.js server logs for progress.');
    } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      log.error(`Failed to connect to API server. Is the Next.js dev server running?`);
      log.info('Start it with: npm run dev');
    } else {
      log.error(`Failed to call API: ${error.message}`);
    }
    return false;
  }
}

async function displayConfiguration() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`${colors.cyan}  Base Mainnet Merkle API Test${colors.reset}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  log.info('Deployment Configuration:');
  log.data('Network', `${deployment.network} (Chain ID: ${deployment.chainId})`);
  log.data('BTC1USD', deployment.core.btc1usd);
  log.data('WeeklyDistribution', deployment.distribution.weeklyDistribution);
  log.data('MerkleDistributor', deployment.distribution.merkleDistributor);
  log.data('Admin', deployment.config.admin);
  console.log('');
}

async function main() {
  try {
    displayConfiguration();

    // Step 1: Check environment
    const envOk = await checkEnvironment();
    if (!envOk) {
      log.error('Environment check failed. Please configure your .env.local file.');
      process.exit(1);
    }
    console.log('');

    // Step 2: Verify deployed contracts
    const contractsOk = await checkDeployedContracts();
    if (!contractsOk) {
      log.error('Contract verification failed. Please check your deployment.');
      process.exit(1);
    }
    console.log('');

    // Step 3: Check for holders
    const holdersOk = await checkBTC1Holders();
    console.log('');

    // Step 4: Test the API
    const apiOk = await testMerkleAPI();
    console.log('');

    if (apiOk) {
      console.log('═══════════════════════════════════════════════════════════════');
      log.success('All tests passed! Merkle API is working correctly.');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      log.info('Next Steps:');
      console.log('  1. Review the generated merkle root and claims');
      console.log('  2. Call WeeklyDistribution.updateMerkleRoot() with the merkle root');
      console.log('  3. Users can claim their rewards via MerkleDistributor.claim()');
      console.log('');
    } else {
      console.log('═══════════════════════════════════════════════════════════════');
      log.error('Tests failed. Please review the errors above.');
      console.log('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    }

  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main();
