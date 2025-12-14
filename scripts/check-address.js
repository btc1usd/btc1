const { ethers } = require('ethers');
require('dotenv').config();

const address = '0xa1fcf334F8ee86eCaD93D4271Ed25a50d60aa72B';

async function checkAddress() {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    console.error('ALCHEMY_API_KEY not found');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(
    `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  );

  try {
    console.log(`Checking address: ${address}`);
    const code = await provider.getCode(address);
    console.log(`Code: ${code}`);
    console.log(`Is Contract: ${code !== '0x'}`);
    console.log(`Is EOA: ${code === '0x'}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAddress();
