import { ethers } from 'ethers';

/**
 * Represents a liquidity provider's position
 */
export interface LpPosition {
  address: string;
  lpBalance: bigint;
  lpShare: number; // 0-1 representing percentage of pool
}

/**
 * Configuration for a known liquidity pool
 */
export interface LpPoolConfig {
  name: string;
  poolAddress: string;
  lpTokenAddress: string; // Can be same as poolAddress for UniswapV2-style
  dexType: 'uniswap-v2' | 'aerodrome' | 'solidly' | 'uniswap-v3';
}

// Minimal ERC20 ABI for LP tokens
const LP_TOKEN_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  }
];

/**
 * Fetches LP token holders using Alchemy API
 */
async function getLpHoldersFromAlchemy(lpTokenAddress: string): Promise<string[]> {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  
  if (!alchemyApiKey) {
    console.log('⚠️ Alchemy API key not found, skipping Alchemy method for LP holders');
    return [];
  }

  try {
    console.log(`🔍 Fetching LP token holders from Alchemy for ${lpTokenAddress}...`);
    const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

    // Use Alchemy's getAssetTransfers to find all addresses that have interacted with LP token
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          contractAddresses: [lpTokenAddress],
          category: ['erc20'],
          withMetadata: false,
          excludeZeroValue: true,
          maxCount: '0x3e8' // 1000 transfers
        }],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result?.transfers) {
      const uniqueAddresses = new Set<string>();

      data.result.transfers.forEach((transfer: any) => {
        if (transfer.from && transfer.from !== '0x0000000000000000000000000000000000000000') {
          uniqueAddresses.add(transfer.from.toLowerCase());
        }
        if (transfer.to && transfer.to !== '0x0000000000000000000000000000000000000000') {
          uniqueAddresses.add(transfer.to.toLowerCase());
        }
      });

      const holders = Array.from(uniqueAddresses);
      console.log(`✅ Alchemy found ${holders.length} unique LP token holders`);
      return holders;
    }
  } catch (error) {
    console.warn('⚠️ Alchemy API failed for LP holders:', error instanceof Error ? error.message : error);
  }

  return [];
}

/**
 * Fetches LP token holders and their positions for a specific pool
 * 
 * @param poolConfig - Configuration for the liquidity pool
 * @param provider - Ethers provider
 * @param excludedAddresses - Addresses to exclude (e.g., protocol wallets)
 * @returns Array of LP positions with balances and shares
 */
export async function getLpProvidersForPool(
  poolConfig: LpPoolConfig,
  provider: ethers.JsonRpcProvider,
  excludedAddresses: string[] = []
): Promise<LpPosition[]> {
  console.log(`\n🏊 Fetching LP providers for ${poolConfig.name}...`);
  console.log(`   Pool: ${poolConfig.poolAddress}`);
  console.log(`   LP Token: ${poolConfig.lpTokenAddress}`);

  // Create contract instance for LP token
  const lpToken = new ethers.Contract(
    poolConfig.lpTokenAddress,
    LP_TOKEN_ABI,
    provider
  );

  // Get total supply first
  let totalSupply: bigint;
  try {
    totalSupply = await lpToken.totalSupply();
    console.log(`   Total LP Supply: ${ethers.formatUnits(totalSupply, 18)}`);
  } catch (error) {
    console.error(`❌ Failed to get LP token total supply:`, error);
    throw new Error(`Cannot fetch total supply for LP token ${poolConfig.lpTokenAddress}`);
  }

  if (totalSupply === BigInt(0)) {
    console.log('⚠️ LP token has zero total supply - no liquidity in pool');
    return [];
  }

  // Get LP token holders via Alchemy
  const alchemyHolders = await getLpHoldersFromAlchemy(poolConfig.lpTokenAddress);

  if (alchemyHolders.length === 0) {
    console.log('⚠️ No LP holders found via Alchemy');
    return [];
  }

  // Create exclusion set (case-insensitive)
  const excludedSet = new Set(excludedAddresses.map(addr => addr.toLowerCase()));

  // Check balance for each holder
  const lpPositions: LpPosition[] = [];

  for (const address of alchemyHolders) {
    // Skip excluded addresses (protocol wallets)
    if (excludedSet.has(address.toLowerCase())) {
      console.log(`   ⊘ Skipping excluded address: ${address}`);
      continue;
    }

    try {
      const balance = await lpToken.balanceOf(address);
      
      if (balance > BigInt(0)) {
        // Calculate LP share (as a decimal 0-1)
        const share = Number(balance) / Number(totalSupply);
        
        lpPositions.push({
          address,
          lpBalance: balance,
          lpShare: share
        });

        console.log(`   ✓ ${address}: ${ethers.formatUnits(balance, 18)} LP tokens (${(share * 100).toFixed(4)}% of pool)`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Failed to get LP balance for ${address}:`, error);
    }
  }

  console.log(`\n✅ Found ${lpPositions.length} active LP providers for ${poolConfig.name}`);
  return lpPositions;
}

/**
 * Fetches LP providers across multiple pools
 * 
 * @param poolConfigs - Array of pool configurations
 * @param provider - Ethers provider
 * @param excludedAddresses - Addresses to exclude
 * @returns Aggregated LP positions (same address may appear in multiple pools)
 */
export async function getAllLpProviders(
  poolConfigs: LpPoolConfig[],
  provider: ethers.JsonRpcProvider,
  excludedAddresses: string[] = []
): Promise<{ poolName: string; providers: LpPosition[] }[]> {
  console.log(`\n🌊 Fetching LP providers across ${poolConfigs.length} pools...`);

  const results: { poolName: string; providers: LpPosition[] }[] = [];

  for (const poolConfig of poolConfigs) {
    try {
      const providers = await getLpProvidersForPool(poolConfig, provider, excludedAddresses);
      results.push({
        poolName: poolConfig.name,
        providers
      });
    } catch (error) {
      console.error(`❌ Failed to fetch LP providers for ${poolConfig.name}:`, error);
      // Continue with other pools even if one fails
    }
  }

  return results;
}

/**
 * Helper to check if an address is a contract
 */
export async function isContract(address: string, provider: ethers.JsonRpcProvider): Promise<boolean> {
  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch (error) {
    console.warn(`Failed to check if ${address} is a contract:`, error);
    return false;
  }
}
