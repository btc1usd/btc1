// generate-merkle-from-gauge.js
require("dotenv").config();
const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
let pLimit = require("p-limit");

// Defensive: some installs export default
if (
  typeof pLimit !== "function" &&
  pLimit &&
  typeof pLimit.default === "function"
) {
  pLimit = pLimit.default;
}

const fs = require("fs");
const path = require("path");

const ALCHEMY_KEY = process.env.ALCHEMY_KEY;
const RPC_URL =
  process.env.RPC_URL ||
  (ALCHEMY_KEY ? https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY} : null);
const GAUGE = (process.env.GAUGE_ADDRESS || "").trim();
const TOKEN = (process.env.TOKEN_ADDRESS || "").trim(); // BTC1 token
let LP_TOKEN = (process.env.LP_TOKEN || "").trim(); // optional override
const FROM_BLOCK = process.env.FROM_BLOCK ? Number(process.env.FROM_BLOCK) : 0;
const TO_BLOCK = process.env.TO_BLOCK || "latest";
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const OUT_FILE = process.env.OUT_FILE || distribution-output.json;
const LOG_PAGE_BLOCKS = Number(process.env.LOG_PAGE_BLOCKS || 50000);

if (!ALCHEMY_KEY) {
  console.error("Missing ALCHEMY_KEY in .env");
  process.exit(1);
}
if (!GAUGE) {
  console.error("Missing GAUGE_ADDRESS in .env");
  process.exit(1);
}
if (!TOKEN) {
  console.error("Missing TOKEN_ADDRESS in .env");
  process.exit(1);
}
if (!RPC_URL) {
  console.error("RPC_URL could not be determined.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tryCall(addr, abiFragment, fn, args = []) {
  try {
    const c = new ethers.Contract(addr, [abiFragment], provider);
    return await c[fn](...args);
  } catch (err) {
    return null;
  }
}

async function detectLpTokenFromGauge(gaugeAddr) {
  if (LP_TOKEN) {
    console.log("Using LP_TOKEN override from env:", LP_TOKEN);
    return LP_TOKEN;
  }
  const tries = [
    ["function lp_token() view returns (address)", "lp_token"],
    ["function staking_token() view returns (address)", "staking_token"],
    ["function token() view returns (address)", "token"],
    ["function deposit_token() view returns (address)", "deposit_token"],
    ["function lpToken() view returns (address)", "lpToken"],
  ];
  for (const [abi, fn] of tries) {
    const res = await tryCall(gaugeAddr, abi, fn);
    if (res && res !== ethers.ZeroAddress) {
      console.log(Detected LP token via ${fn}:, res);
      return res;
    }
  }
  console.warn(
    "Could not detect lp_token via common getters. Provide LP_TOKEN in .env if you know it."
  );
  return null;
}

// Alchemy alchemy_getAssetTransfers wrapper (base-mainnet endpoint)
async function alchemyGetAssetTransfers(params) {
  const alchemyBase = RPC_URL.includes("alchemy")
    ? RPC_URL
    : https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY};
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getAssetTransfers",
    params: [params],
  };
  const res = await fetch(alchemyBase, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(Alchemy HTTP ${res.status}: ${txt || res.statusText});
  }
  const json = await res.json();
  if (json.error)
    throw new Error(Alchemy error: ${JSON.stringify(json.error)});
  return json.result;
}

function toHexBlock(n) {
  if (n === "latest") return "latest";
  if (!n && n !== 0) return "0x0";
  return "0x" + Number(n).toString(16);
}

async function collectAddressesFromAlchemy(
  lpTokenAddr,
  fromBlock = 0,
  toBlock = "latest"
) {
  console.log("Paging alchemy_getAssetTransfers for LP token:", lpTokenAddr);
  const unique = new Set();
  let pageKey = undefined;
  let round = 0;
  do {
    round++;
    const params = {
      fromBlock:
        typeof fromBlock === "number" ? toHexBlock(fromBlock) : fromBlock,
      toBlock: toBlock === "latest" ? "latest" : toHexBlock(Number(toBlock)),
      contractAddresses: [lpTokenAddr],
      category: ["erc20"],
      withMetadata: false,
      excludeZeroValue: true,
      maxCount: "0x3e8",
    };
    if (pageKey) params.pageKey = pageKey;
    process.stdout.write(
      ` → alchemy page ${round} (pageKey=${pageKey || "none"}) ... `
    );
    let r;
    try {
      r = await alchemyGetAssetTransfers(params);
    } catch (err) {
      console.warn("\nAlchemy request failed:", err.message || err);
      await sleep(700);
      try {
        r = await alchemyGetAssetTransfers(params);
      } catch (err2) {
        throw new Error(Alchemy paging failed twice: ${err2.message || err2});
      }
    }
    const transfers = r.transfers || [];
    for (const t of transfers) {
      if (t.from) unique.add(t.from.toLowerCase());
      if (t.to) unique.add(t.to.toLowerCase());
    }
    pageKey = r.pageKey;
    console.log(
      fetched ${transfers.length}, unique addresses so far: ${unique.size}
    );
    await sleep(120);
  } while (pageKey);
  unique.delete("0x0000000000000000000000000000000000000000");
  return Array.from(unique);
}

async function fetchGaugeBalances(gaugeAddr, addresses) {
  console.log(
    Fetching gauge.balanceOf for ${addresses.length} candidate addresses (concurrency ${CONCURRENCY})...
  );
  const gauge = new ethers.Contract(
    gaugeAddr,
    [
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
    ],
    provider
  );
  const limit = pLimit(CONCURRENCY);
  const out = [];
  const tasks = addresses.map((addr) =>
    limit(async () => {
      try {
        const b = await gauge.balanceOf(addr);
        const bi = BigInt(b.toString());
        if (bi > 0n) out.push({ address: addr, balance: bi });
      } catch (err) {
        // transient revert or rate limit: log and skip
        console.warn(
          ` gauge.balanceOf failed for ${addr}: ${err.message || err}`
        );
      }
    })
  );
  await Promise.all(tasks);
  return out;
}

async function getGaugeTotalSupply(gaugeAddr) {
  try {
    const gauge = new ethers.Contract(
      gaugeAddr,
      ["function totalSupply() view returns (uint256)"],
      provider
    );
    const ts = await gauge.totalSupply();
    return BigInt(ts.toString());
  } catch (err) {
    console.warn("gauge.totalSupply() failed:", err.message || err);
    return BigInt(0);
  }
}

async function getPairTokenReserve(pairAddr, tokenAddr) {
  try {
    const pair = new ethers.Contract(
      pairAddr,
      [
        "function getReserves() view returns (uint112,uint112,uint32)",
        "function token0() view returns (address)",
        "function token1() view returns (address)",
        "function balances(address) view returns (uint256)",
      ],
      provider
    );

    const [reserves, t0, t1] = await Promise.all([
      pair.getReserves().catch(() => null),
      pair.token0().catch(() => null),
      pair.token1().catch(() => null),
    ]);

    if (reserves && (t0 || t1)) {
      if (t0 && t0.toLowerCase() === tokenAddr.toLowerCase())
        return BigInt(reserves[0].toString());
      if (t1 && t1.toLowerCase() === tokenAddr.toLowerCase())
        return BigInt(reserves[1].toString());
      return BigInt(reserves[0].toString());
    }

    const b = await pair.balances(tokenAddr).catch(() => null);
    if (b) return BigInt(b.toString());

    const token = new ethers.Contract(
      tokenAddr,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );
    const bal = await token.balanceOf(pairAddr);
    return BigInt(bal.toString());
  } catch (err) {
    console.warn("getPairTokenReserve failed:", err.message || err);
    return BigInt(0);
  }
}

function makeLeaf(index, account, amount) {
  try {
    const packed = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256"],
      [BigInt(index), account, BigInt(amount)]
    );
    return Buffer.from(packed.slice(2), "hex");
  } catch (err) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["uint256", "address", "uint256"],
      [BigInt(index), account, BigInt(amount)]
    );
    const hash = ethers.keccak256(encoded);
    return Buffer.from(hash.slice(2), "hex");
  }
}

function formatUnitsSafe(value, decimals = 8) {
  try {
    return ethers.formatUnits(value.toString(), decimals);
  } catch {
    return value.toString();
  }
}

(async function main() {
  console.log("RPC:", RPC_URL);
  console.log("GAUGE:", GAUGE);
  console.log("TOKEN:", TOKEN);

  // 1) detect LP token from gauge
  const lpToken = (await detectLpTokenFromGauge(GAUGE)) || LP_TOKEN;
  if (!lpToken) {
    console.error(
      "LP token not detected and not provided. Set LP_TOKEN in .env to the LP/pair address."
    );
    process.exit(1);
  }
  console.log("LP token (pair) used:", lpToken);

  // 2) collect candidate addresses via Alchemy
  let candidates = [];
  try {
    candidates = await collectAddressesFromAlchemy(
      lpToken,
      FROM_BLOCK,
      TO_BLOCK
    );
  } catch (err) {
    console.error(
      "Failed to collect addresses from Alchemy:",
      err.message || err
    );
    process.exit(1);
  }
  console.log("Candidates count from Alchemy:", candidates.length);

  // 3) call gauge.balanceOf for each candidate
  const providers = await fetchGaugeBalances(GAUGE, candidates);
  console.log("Non-zero gauge holders discovered:", providers.length);

  // 4) get gauge.totalSupply
  let totalLpSupply = await getGaugeTotalSupply(GAUGE);
  if (totalLpSupply === 0n) {
    totalLpSupply = providers.reduce((acc, p) => acc + BigInt(p.balance), 0n);
  }
  console.log("Total LP supply (gauge):", totalLpSupply.toString());

  // 5) compute token reserve for the pair
  const tokenReserve = await getPairTokenReserve(lpToken, TOKEN);
  console.log(
    "Token reserve (raw):",
    tokenReserve.toString(),
    "formatted:",
    formatUnitsSafe(tokenReserve, 8)
  );

  // 6) compute provider token shares and produce claims
  const claims = [];
  let index = 0;
  let totalRewards = 0n;

  providers.sort((a, b) =>
    BigInt(b.balance) > BigInt(a.balance)
      ? 1
      : BigInt(b.balance) < BigInt(a.balance)
      ? -1
      : 0
  );

  for (const p of providers) {
    const lpBal = BigInt(p.balance);
    const tokenShare =
      totalLpSupply === 0n ? 0n : (lpBal * tokenReserve) / totalLpSupply;
    if (tokenShare > 0n) {
      claims.push({
        index,
        account: p.address,
        amount: tokenShare.toString(),
        proof: [],
      });
      totalRewards += tokenShare;
      index++;
    }
  }

  if (claims.length === 0) {
    console.warn(
      "No claims generated (empty providers or tokenShares). Exiting with empty distribution."
    );
  } else {
    console.log(
      `Generated ${
        claims.length
      } claim(s) with total token amount (raw): ${totalRewards.toString()} formatted: ${formatUnitsSafe(
        totalRewards,
        8
      )}`
    );
  }

  // 7) build merkle tree
  const leaves = claims.map((c) => makeLeaf(c.index, c.account, c.amount));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const merkleRoot = tree.getHexRoot();
  console.log("Merkle root:", merkleRoot);

  for (let i = 0; i < claims.length; i++) {
    const proof = tree.getHexProof(leaves[i]);
    claims[i].proof = proof;
  }

  const distribution = {
    generated: new Date().toISOString(),
    gauge: GAUGE,
    lpToken,
    token: TOKEN,
    fromBlock: FROM_BLOCK,
    toBlock: TO_BLOCK,
    totalLpSupply: totalLpSupply.toString(),
    tokenReserve: tokenReserve.toString(),
    merkleRoot,
    totalRewards: totalRewards.toString(),
    claimsCount: claims.length,
    claims: claims,
  };

  const outfile = path.join(process.cwd(), OUT_FILE);
  fs.writeFileSync(outfile, JSON.stringify(distribution, null, 2));
  console.log("Saved distribution to", outfile);
  process.exit(0);
})().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});