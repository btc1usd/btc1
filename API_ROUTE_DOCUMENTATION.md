# BTC1 Merkle Tree Generation API - Complete Documentation

## Overview

Production-grade Next.js API route for generating Merkle Tree reward distributions with **automatic LP pair detection** and **LP provider balance aggregation**.

**Location**: `/app/api/generate-merkle/route.ts`

---

## ✅ Core Features Implemented

### 1. **Direct Token Holder Detection**
- Uses Alchemy `alchemy_getAssetTransfers` to discover all addresses
- Fetches `balanceOf()` for each address
- Filters out zero balances
- **Pagination support** for large holder lists

### 2. **Automatic LP Pair Detection**
- Scans all addresses for Uniswap V2-style LP pairs
- Validates contracts support:
  - `token0()`
  - `token1()`
  - `getReserves()`
  - `totalSupply()`
- Confirms one side is BTC1
- **Manual override** via `NEXT_PUBLIC_BTC1_LP_PAIRS` ENV variable

### 3. **LP Provider Share Calculation**
```typescript
userShare = (lpBalance / totalSupply) * btc1Reserve
```
- Fetches all LP token holders via Alchemy
- Calculates each user's BTC1 share in the pool
- Accurate to the wei level

### 4. **Balance Aggregation**
- Merges direct BTC1 balances
- Adds LP-derived BTC1 shares
- Deduplicates by address (case-insensitive)
- Final output: `Map<address, totalBTC1Balance>`

### 5. **Protocol Wallet Exclusion**
- Fetches from `getExcludedAddresses()` on WeeklyDistribution
- Fallback to ENV variables:
  - `NEXT_PUBLIC_MERKLE_DISTRIBUTOR_CONTRACT`
  - `NEXT_PUBLIC_DEV_WALLET_CONTRACT`
  - `NEXT_PUBLIC_ENDOWMENT_WALLET_CONTRACT`
  - `NEXT_PUBLIC_MERKLE_FEE_COLLECTOR_CONTRACT`

### 6. **Reward Calculation**
```typescript
reward = (finalBalance * rewardPerToken) / 1e8
```
- Fetches `getCurrentDistributionInfo()` from WeeklyDistribution
- Uses contract's `rewardPerToken` value
- 8 decimal precision (BTC1USD standard)

### 7. **Merkle Tree Generation**
```typescript
leaf = keccak256(abi.encodePacked(index, address, amount))
```
- Compatible with Solidity contracts
- Generates merkle root
- Provides proof arrays for each claim

### 8. **Dual Storage System**
- **Primary**: Supabase (`merkle_distributions` table)
- **Fallback**: File system (`/merkle-distributions/distribution-{id}.json`)
- Automatic failover

---

## 📋 API Response Format

```typescript
{
  success: true,
  distributionId: "1",
  merkleRoot: "0x...",
  totalRewards: "1000000000", // 8 decimals
  activeHolders: 150,
  lpPairsDetected: 3,
  claims: {
    "0xAddress1": {
      index: 0,
      account: "0xAddress1",
      amount: "5000000", // 8 decimals
      proof: ["0x...", "0x..."]
    },
    // ... more claims
  },
  distributionData: {
    distributionId: "1",
    merkleRoot: "0x...",
    totalRewards: "1000000000",
    claims: { /* ... */ },
    metadata: {
      generated: "2025-12-10T15:00:00.000Z",
      activeHolders: 150,
      totalHolders: 200,
      lpPairsDetected: 3,
      lpHoldersProcessed: 50,
      excludedAddresses: ["0x...", "0x..."],
      excludedCount: 4
    }
  }
}
```

---

## 🔧 Environment Variables

### Required
```env
# Alchemy API (for holder detection)
ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key

# Contract Addresses
NEXT_PUBLIC_BTC1USD_CONTRACT=0x...
NEXT_PUBLIC_WEEKLY_DISTRIBUTION_CONTRACT=0x...
NEXT_PUBLIC_MERKLE_DISTRIBUTOR_CONTRACT=0x...

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=8453  # 8453 for Base Mainnet, 84532 for Base Sepolia
```

### Optional
```env
# Protocol Wallets (fallback if getExcludedAddresses() fails)
NEXT_PUBLIC_DEV_WALLET_CONTRACT=0x...
NEXT_PUBLIC_ENDOWMENT_WALLET_CONTRACT=0x...
NEXT_PUBLIC_MERKLE_FEE_COLLECTOR_CONTRACT=0x...

# Manual LP Pair Addresses (comma-separated)
NEXT_PUBLIC_BTC1_LP_PAIRS=0xPair1,0xPair2,0xPair3

# Supabase (for storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🚀 Usage

### Basic POST Request
```bash
curl -X POST https://your-domain.com/api/generate-merkle \
  -H "Content-Type: application/json"
```

### From Frontend
```typescript
const response = await fetch('/api/generate-merkle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const data = await response.json();
console.log('Merkle Root:', data.merkleRoot);
console.log('Total Claims:', data.activeHolders);
```

---

## 🏗️ Architecture

### Execution Flow
```
1. Initialize Provider (Base Mainnet/Sepolia with fallback)
   ↓
2. Fetch Contract Addresses (ENV → deployment files)
   ↓
3. Get Distribution Info from WeeklyDistribution
   ↓
4. Discover All Addresses (Alchemy transfers API)
   ↓
5. Fetch Direct Holders (balanceOf for each)
   ↓
6. Detect LP Pairs (scan for Uniswap V2 interfaces)
   ↓
7. Fetch LP Holders (Alchemy for each pair)
   ↓
8. Calculate LP Shares (balance * reserve / totalSupply)
   ↓
9. Aggregate Balances (direct + LP shares)
   ↓
10. Filter Excluded Addresses
   ↓
11. Calculate Rewards (balance * rewardPerToken / 1e8)
   ↓
12. Generate Merkle Tree (keccak256 + proofs)
   ↓
13. Save to Supabase + File System
   ↓
14. Return Response
```

### Key Functions

#### `getAllAddressesFromAlchemy(tokenAddress)`
- Fetches all Transfer events via Alchemy
- Returns unique addresses (from + to)
- Handles pagination automatically

#### `getAllDirectHolders(btc1Contract, addresses)`
- Checks `balanceOf()` for each address
- Batched processing (50 addresses/batch)
- Returns holders with balance > 0

#### `findBTC1LPPairs(provider, btc1Address, addresses)`
- Checks each address for Uniswap V2 interface
- Validates BTC1 is token0 or token1
- Returns LP pair info (reserves, totalSupply)

#### `calculateLPProviderShares(provider, pairInfo)`
- Fetches LP token holders via Alchemy
- Calculates: `userShare = (lpBalance / totalSupply) * btc1Reserve`
- Returns Map<address, btc1Share>

#### `aggregateHoldersAndLPProviders(directHolders, lpPairs, provider)`
- Merges direct balances + LP shares
- Deduplicates by address
- Returns final balance map

#### `generateMerkleTree(balances, rewardPerToken, excludedSet)`
- Filters excluded addresses
- Calculates rewards per holder
- Generates merkle root + proofs

---

## 🔒 Security Features

1. **Read-Only Operations**: No state modifications
2. **Gas-Free**: All calls are `view` functions
3. **Input Validation**: Contract address verification
4. **Error Handling**: Comprehensive try-catch blocks
5. **Rate Limiting**: Batched RPC calls to avoid throttling
6. **Excluded Wallets**: Protocol addresses never receive rewards

---

## ⚡ Performance Optimizations

1. **Batch Processing**: 50 addresses per batch for balance checks
2. **Parallel Execution**: `Promise.all()` for concurrent requests
3. **Pagination**: Alchemy API pagination for large datasets
4. **Early Filtering**: Zero balance filtering before aggregation
5. **Efficient Data Structures**: `Map` and `Set` for O(1) lookups

---

## 🐛 Error Handling

### Network Errors
```json
{
  "error": "Network connection failed",
  "details": "Unable to connect to Base Mainnet network",
  "suggestions": [
    "Check your internet connection",
    "Verify RPC configuration",
    "Try again in a few minutes"
  ]
}
```

### No Holders Found
```json
{
  "error": "No addresses found. Please ensure there are BTC1 transfers.",
  "status": 400
}
```

### Supabase + File System Failure
```json
{
  "error": "Failed to save distribution to both Supabase and file system"
}
```

---

## 📊 Logging

Detailed console logs for monitoring:
```
🚀 Starting comprehensive merkle tree generation with LP detection...
📊 Distribution ID: 1, Reward per token: 0.01
🚫 Excluded addresses: 4
📍 STEP 1: Discovering all addresses...
✅ Alchemy found 523 unique addresses from 1247 transfers
📍 STEP 2: Fetching direct BTC1 holders...
✅ Found 142 direct holders with balance > 0
📍 STEP 3: Detecting LP pairs...
  ✓ Found LP pair: 0xPair1
    Tokens: 0xbtc1 / 0xweth
    BTC1 Reserve: 50000.00000000
✅ Found 3 LP pairs containing BTC1
📍 STEP 4: Aggregating balances...
  Added 142 direct holders
  ✅ Calculated shares for 38 LP providers
✅ Total unique addresses: 180
📍 STEP 5: Generating merkle tree...
  Generated 176 claims, total rewards: 1000.00000000 BTC1USD
✅ Merkle tree generated with root: 0x...
📍 STEP 6: Saving distribution data...
✅ Saved to Supabase
🎉 Merkle tree generation completed successfully!
```

---

## 🧪 Testing

### Local Development
```bash
# 1. Start local node
npx hardhat node

# 2. Deploy contracts
npx hardhat run scripts/deploy-complete-local.js --network localhost

# 3. Test API
curl -X POST http://localhost:3000/api/generate-merkle
```

### Base Sepolia Testnet
```bash
# Set environment variables
export NEXT_PUBLIC_CHAIN_ID=84532
export ALCHEMY_API_KEY=your_key

# Test API
curl -X POST https://your-netlify-url.com/api/generate-merkle
```

### Base Mainnet
```bash
export NEXT_PUBLIC_CHAIN_ID=8453
export ALCHEMY_API_KEY=your_mainnet_key
```

---

## 🔄 Integration with Smart Contracts

### 1. Execute Distribution
```typescript
// Call WeeklyDistribution.executeDistribution()
// This mints tokens and creates placeholder merkle root
```

### 2. Generate Merkle Tree
```typescript
// POST to /api/generate-merkle
const response = await fetch('/api/generate-merkle', { method: 'POST' });
const { merkleRoot, totalRewards, distributionId } = await response.json();
```

### 3. Update Merkle Root
```solidity
// Call WeeklyDistribution.updateMerkleRoot(merkleRoot, totalRewards)
// This updates the distribution with real merkle root
```

### 4. Users Claim Rewards
```solidity
// Users call MerkleDistributor.claim(distributionId, index, account, amount, proof)
```

---

## 📈 Scalability

### Current Limits
- **Addresses scanned**: Unlimited (pagination)
- **Direct holders**: Unlimited (batched)
- **LP pairs**: Practical limit ~100 pairs
- **Claims**: Unlimited (storage dependent)

### Recommendations
- For >10,000 holders: Consider server-side caching
- For >100 LP pairs: Implement manual LP whitelist
- For high-frequency calls: Add Redis caching layer

---

## 🛠️ Troubleshooting

### Issue: "No addresses found"
**Solution**: Ensure BTC1 token has Transfer events on-chain

### Issue: "Alchemy API failed"
**Solution**: Check API key, rate limits, network selection

### Issue: "No LP pairs found"
**Solution**: 
1. Check if LP pairs exist on-chain
2. Use `NEXT_PUBLIC_BTC1_LP_PAIRS` to manually specify
3. Verify LP contracts implement Uniswap V2 interface

### Issue: "Supabase save failed"
**Solution**:
1. Check Supabase credentials
2. Verify table schema matches
3. File system fallback will activate automatically

---

## 📝 Future Enhancements

### Optional Features (Not Implemented)
- [ ] Snapshot block number support
- [ ] Multicall optimization for batch `balanceOf()`
- [ ] Alternative DEX support (Uniswap V3, Curve)
- [ ] Historical distribution comparison
- [ ] Gas estimation for claim transactions

---

## 📄 License

MIT License - BTC1USD Protocol

---

## 🤝 Support

For issues or questions:
1. Check logs for detailed error messages
2. Verify environment variables
3. Test on Base Sepolia first
4. Review contract deployment status

---

**Last Updated**: December 10, 2025  
**Version**: 1.0.0  
**Network**: Base (Mainnet & Sepolia)
