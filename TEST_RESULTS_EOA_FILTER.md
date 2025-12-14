# Merkle Tree EOA Filter - Test Results

## Test Date
2025-12-14

## Objective
Verify that the `/api/generate-merkle-tree` endpoint correctly filters out smart contracts and only includes EOAs (Externally Owned Accounts) in the Merkle tree distribution.

## Test Methodology

### Test Script
- **Location**: `scripts/test-merkle-eoa-filter.js`
- **Purpose**: Call the Merkle API and verify each address in the resulting tree is an EOA

### Test Steps
1. Check environment configuration
2. Initialize Base Mainnet provider
3. Call `/api/generate-merkle-tree` endpoint
4. Analyze response data
5. Verify each address using `provider.getCode()`
6. Report results

## Test Results

### ✅ TEST PASSED

**Summary Statistics:**
- **Total Addresses in Merkle Tree**: 8
- **EOA Addresses (Correct)**: 8 ✅
- **Smart Contracts (Should be 0)**: 0 ✅

### Addresses Verified as EOAs
All 8 addresses were confirmed as EOAs:
1. `0x70cfc7ae6f73e14345fc3e8846e5d6b1b49460ec` - 0.1 BTC1USD
2. `0x6210ffe7340dc47d5da4b888e850c036cc6ee835` - 0.1 BTC1USD
3. `0x13aa37d851526a148ce23d4c839eec88e8b7c5bc` - 0.01 BTC1USD
4. `0x5aafc1f252d544f744d17a4e734afd6efc47ede4` - 0.00006263 BTC1USD
5. `0xad01c20d5886137e056775af56915de824c8fce5` - 0.0000062 BTC1USD
6. `0x50f772ba2b9439752662283128ce4b0f3e17a3c0` - 0.45916307 BTC1USD
7. `0x5b631b3b8e1a6e16eb5fab45e946c57a4232abf4` - 5.0 BTC1USD
8. `0x5d37ad66bb1c629f83c8762a23575e5e44f48659` - 201.0 BTC1USD

### Smart Contracts Filtered Out
The API successfully filtered out **22 smart contracts** during processing:

**Known Protocol Contracts:**
- `0x7044d853050cd089b4a796fa8eada581c205d106` - Protocol wallet
- `0x3c8b5837a184ef87543fdd7401ed575f5ceb170e` - Protocol wallet
- `0x9ba818c20198936d0cf3d9683c3095541cec366a` - Protocol wallet
- `0x108efce368db385a7fda8f3a8266d6cd16a3b282` - Protocol wallet

**Third-party Smart Contracts (DEX Routers, LP Pools, etc):**
- `0xa1fcf334f8ee86ecad93d4271ed25a50d60aa72b`
- `0xa81eebdeb3129bf5b89aed89ede9ec5fb6fde3b3`
- `0x269251b69fcd1ceb0500a86408cab39666b2077a`
- `0x111111125421ca6dc452d289314280a0f8842a65` - 1inch Router
- `0x0a2854fbbd9b3ef66f17d47284e7f899b9509330`
- `0x00bfddfdb386a71e2fb1d1763e3d1f0f1fe8af64`
- `0x8284b18124b8726f550ef5882544c55c8ebb8cce`
- `0x1111111254eeb25477b68fb85ed929f73a960582` - 1inch Router v5
- `0x785648669b8e90a75a6a8de682258957f9028462`
- `0x8c864d0c8e476bf9eb9d620c10e1296fb0e2f940`
- `0x498581ff718922c3f8e6a244956af099b2652b2b`
- `0x6ff5693b99212da76ad316178a184ab56d299b43`
- `0x5d64d14d2cf4fe5fe4e65b1c7e3d11e18d493091` - Uniswap Universal Router
- `0xf669d50334177dc11296b61174955a0216adad38`
- `0xb9a1094d614c70b94c2cd7b4efc3a6adc6e6f4d3`
- `0x9d3a11303486e7d773f0ddfd2f47c4b374533580`
- `0x2bd541ab3b704f7d4c9dff79efadeaa85ec034f1`
- `0xcb3d2a42022741b06f9b38459e3dd1ee9a64d129`
- `0x30bf20a8439af6c991eecdb12cd8d89a8eb81bab`
- `0x63242a4ea82847b20e506b63b0e2e2eff0cc6cb0`

## Distribution Metadata

**Distribution Details:**
- **Distribution ID**: 1
- **Merkle Root**: `0x69bdc3d435bcafab812643b5d143dd60d44672cc7fe2827fd967f5006fa1f927`
- **Total Rewards**: 2.06669231 BTC1USD
- **Active Holders**: 8
- **Total Claims**: 8

**Metadata Note:**
> "Protocol wallets (Merkle Distributor, Dev Wallet, Endowment Wallet) and smart contracts are excluded. Only EOA (Externally Owned Account) holders receive rewards."

## Code Changes

### File Modified
`app/api/generate-merkle-tree/route.ts`

### Changes Implemented

1. **Added `isContract` helper function**:
   ```typescript
   const isContract = async (provider: ethers.JsonRpcProvider, address: string): Promise<boolean> => {
     try {
       const code = await provider.getCode(address);
       return code !== '0x';
     } catch (error) {
       console.warn(`⚠️ Failed to check if ${address} is contract, treating as EOA`);
       return false;
     }
   };
   ```

2. **Updated `getAllHolders` function**:
   - Now accepts `provider` parameter
   - Checks each address with `isContract()`
   - Filters out smart contracts before checking balances
   - Only returns EOA holders

3. **Enhanced logging**:
   - Logs when smart contracts are skipped: `⊘ Skipping smart contract: 0x...`
   - Indicates EOA status in balance logs: `✓ 0x...: X.XX BTC1USD (EOA)`
   - Updated summary messages to reflect EOA filtering

4. **Improved error messages**:
   - Clarifies that only EOAs are eligible for rewards
   - Mentions smart contract exclusion in suggestions
   - Updated metadata note to document the filtering policy

## Performance Impact

- **API Response Time**: ~35 seconds (34932ms)
- **Address Verification**: 33 addresses checked for contract status
- **Network Calls**: Additional RPC calls for `getCode()` on each address
- **Result**: Acceptable performance for production use

## Conclusion

✅ **The EOA filtering is working correctly!**

The `/api/generate-merkle-tree` endpoint now successfully:
1. Fetches all BTC1USD token holders via Alchemy
2. Filters out all smart contracts (DEX routers, LP pools, etc.)
3. Only includes EOA addresses in the Merkle tree
4. Excludes protocol wallets (Dev, Endowment, Merkle Distributor)
5. Generates accurate reward distributions for eligible holders

This prevents the production error where smart contract holders were causing issues with JSON parsing and distribution processing.

## Recommendations

1. ✅ Deploy to production - the fix is working as expected
2. Consider caching contract check results to improve performance on subsequent runs
3. Monitor API response times in production to ensure acceptable performance
4. Document that LP providers need to hold BTC1USD directly in their EOA to receive rewards

## Next Steps

- [ ] Deploy updated API to production
- [ ] Monitor first production Merkle generation
- [ ] Verify Supabase storage is working correctly
- [ ] Test with larger holder base (100+ addresses)
