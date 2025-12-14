# Merkle Tree API - Quick Reference

## 🎯 Endpoint
```
POST /api/generate-merkle
```

## 🔑 Key Algorithms

### LP Provider Share Calculation
```typescript
userShare = (lpBalance / totalSupply) * btc1Reserve

Example:
- LP Token Balance: 1,000 (out of 10,000 total)
- BTC1 Reserve in Pool: 50,000 BTC1USD
- User's BTC1 Share: (1,000 / 10,000) * 50,000 = 5,000 BTC1USD
```

### Reward Calculation
```typescript
reward = (finalBalance * rewardPerToken) / 1e8

Example:
- Final Balance: 10,000 BTC1USD (100,000,000,000 in 8 decimals)
- Reward Per Token: 0.01 BTC1USD (1,000,000 in 8 decimals)
- Reward: (100,000,000,000 * 1,000,000) / 100,000,000 = 1,000,000,000 (10 BTC1USD)
```

### Merkle Leaf Encoding
```typescript
leaf = keccak256(abi.encodePacked(index, address, amount))

// Solidity equivalent:
bytes32 node = keccak256(abi.encodePacked(index, account, amount));
```

## 📊 Data Flow

```
Alchemy API → All Addresses
     ↓
balanceOf() → Direct Holders
     ↓
Contract Scan → LP Pairs Detected
     ↓
Alchemy API → LP Token Holders
     ↓
(lpBalance/totalSupply) * reserve → LP Shares
     ↓
Direct + LP → Aggregated Balances
     ↓
Filter Excluded → Eligible Holders
     ↓
balance * rewardPerToken / 1e8 → Rewards
     ↓
keccak256(index, address, amount) → Merkle Tree
     ↓
Supabase / File System → Storage
```

## 🔍 LP Pair Detection Logic

```typescript
function isLPPair(address) {
  try {
    token0 = contract.token0()
    token1 = contract.token1()
    reserves = contract.getReserves()
    totalSupply = contract.totalSupply()
    
    if (token0 === BTC1 || token1 === BTC1) {
      return {
        pairAddress: address,
        btc1Reserve: token0 === BTC1 ? reserves.reserve0 : reserves.reserve1,
        totalSupply: totalSupply
      }
    }
  } catch {
    return null // Not a valid LP pair
  }
}
```

## 🧮 Technical Specifications

| Feature | Specification |
|---------|--------------|
| **Decimals** | 8 (BTC1USD standard) |
| **Merkle Hash** | keccak256 |
| **Sorting** | Enabled (sortPairs: true) |
| **Batch Size (balances)** | 50 addresses |
| **Batch Size (LP scan)** | 20 addresses |
| **Pagination** | Automatic (Alchemy) |
| **Max Transfers/Page** | 1,000 |

## 🚦 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | No addresses found | Check BTC1 transfers exist |
| 400 | No eligible claims | Mint tokens to users |
| 500 | Contract not deployed | Deploy contracts first |
| 503 | Network unavailable | Check RPC config |

## 🔧 ENV Variables Priority

```
1. NEXT_PUBLIC_BTC1USD_CONTRACT (highest)
2. deployment-base-mainnet.json
3. deployment-base-sepolia.json
4. deployment-local.json (lowest)
```

## 📦 Response Structure

```typescript
{
  success: boolean
  distributionId: string
  merkleRoot: string
  totalRewards: string          // 8 decimals, wei format
  activeHolders: number
  lpPairsDetected: number
  claims: {
    [address]: {
      index: number
      account: string
      amount: string            // 8 decimals, wei format
      proof: string[]
    }
  }
}
```

## ⚡ Performance Tips

1. **Alchemy API Key**: Required for production scale
2. **Manual LP Pairs**: Set `NEXT_PUBLIC_BTC1_LP_PAIRS` for known pairs
3. **Supabase**: Configure for serverless environments
4. **Batch Size**: Adjust based on RPC rate limits
5. **Caching**: Consider Redis for frequent calls

## 🔐 Security Checklist

- ✅ Read-only contract calls
- ✅ No private keys in code
- ✅ Excluded addresses enforced
- ✅ Input validation on addresses
- ✅ Safe BigInt arithmetic
- ✅ Error boundary handling

## 🧪 Testing Commands

```bash
# Local test
curl -X POST http://localhost:3000/api/generate-merkle

# Check specific distribution
curl https://your-domain.com/api/merkle-distributions/1

# Verify merkle proof (client-side)
const leaf = ethers.solidityPackedKeccak256(
  ['uint256', 'address', 'uint256'],
  [index, account, amount]
)
const isValid = MerkleTree.verify(proof, root, leaf)
```

## 📚 Related Files

- `/app/api/generate-merkle/route.ts` - Main API route
- `/lib/merkle-tree.ts` - Merkle tree utilities
- `/lib/supabase.ts` - Database client
- `/lib/rpc-provider.ts` - Network provider
- `/contracts/WeeklyDistribution.sol` - Distribution logic
- `/contracts/MerkleDistributor.sol` - Claim logic

## 🎓 Key Concepts

### Merkle Tree
Binary tree where each leaf is a hash of claim data (index, address, amount). Root is stored on-chain. Users provide proofs to verify inclusion.

### LP Shares
Liquidity providers own LP tokens representing pool ownership. Their BTC1 exposure = (LP tokens / total LP) × BTC1 in pool.

### Excluded Addresses
Protocol wallets (distributor, dev, endowment) don't earn holder rewards to prevent circular distribution.

### Reward Per Token
Determined by collateral ratio tiers in WeeklyDistribution contract. Higher ratio = higher reward (0.01¢ to 0.10¢ per token).

---

## 🧪 Testing on Base Mainnet

### Quick Test Script

```bash
# 1. Ensure environment variables are set
export NEXT_PUBLIC_CHAIN_ID=8453
export ALCHEMY_API_KEY=your_mainnet_alchemy_key

# 2. Run the test script
node scripts/test-merkle-api-mainnet.js
```

### Manual Testing Steps

**Step 1: Verify Contracts**
```bash
# Check BTC1USD on BaseScan
https://basescan.org/address/0x6dC9C43278AeEa063c01d97505f215ECB6da4a21

# Check WeeklyDistribution
https://basescan.org/address/0x51D622A533C56256c5E318f5aB9844334523dFe0

# Check MerkleDistributor
https://basescan.org/address/0x9Ba818c20198936D0CF3d9683c3095541ceC366A
```

**Step 2: Check Token Holders**
```typescript
// Using ethers
const btc1 = new ethers.Contract(
  '0x6dC9C43278AeEa063c01d97505f215ECB6da4a21',
  ['function balanceOf(address) view returns (uint256)'],
  provider
);

const balance = await btc1.balanceOf('0xYourAddress');
console.log('Balance:', ethers.formatUnits(balance, 8));
```

**Step 3: Call API**
```bash
curl -X POST http://localhost:3000/api/generate-merkle \
  -H "Content-Type: application/json"
```

**Step 4: Verify Response**
```typescript
const response = await fetch('/api/generate-merkle', { method: 'POST' });
const data = await response.json();

// Should return:
{
  success: true,
  distributionId: "1",
  merkleRoot: "0x...",
  totalRewards: "...",
  activeHolders: 10,
  lpPairsDetected: 2,
  claims: { ... }
}
```

### Expected Mainnet Addresses

```typescript
// From deployment-base-mainnet.json
const MAINNET_CONTRACTS = {
  BTC1USD: '0x6dC9C43278AeEa063c01d97505f215ECB6da4a21',
  WeeklyDistribution: '0x51D622A533C56256c5E318f5aB9844334523dFe0',
  MerkleDistributor: '0x9Ba818c20198936D0CF3d9683c3095541ceC366A',
  DevWallet: '0x7044d853050cd089B4A796fA8eADa581c205D106',
  EndowmentWallet: '0x3C8B5837A184ef87543fDd7401ed575F5CEb170e',
  MerklFeeCollector: '0x108eFCe368DB385a7FDa8F3A8266d6CD16a3B282'
};
```

### Troubleshooting Mainnet

**Issue: "No addresses found"**
- Check if BTC1 has any Transfer events on mainnet
- Use BaseScan to view token transfers
- Ensure Alchemy API key is for Base Mainnet

**Issue: "No holders found"**
- Verify tokens have been minted
- Check balances of known addresses (Dev, Endowment wallets)

**Issue: "Network connection failed"**
- Verify `NEXT_PUBLIC_CHAIN_ID=8453`
- Check Alchemy API key is valid
- Test RPC connection: `curl https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`

---

**Remember**: This API is designed to run AFTER `executeDistribution()` is called on the WeeklyDistribution contract, which mints tokens and creates a placeholder merkle root. The generated merkle root from this API is then submitted via `updateMerkleRoot()`.
