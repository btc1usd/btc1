const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// Contract details
const contractAddress = '0x6dC9C43278AeEa063c01d97505f215ECB6da4a21';
const contractName = 'contracts/BTC1USD.sol:BTC1USD';
const compilerVersion = 'v0.8.20+commit.a1b79de6';
const constructorArguments = '0000000000000000000000002c1afddae90ee3bf03f3ab6ba494bcd5a7bd4bca';

// Load the Standard JSON Input
const standardJsonInput = fs.readFileSync('./BTC1USD-standard-input.json', 'utf8');

async function verifyContract() {
  try {
    console.log('Starting contract verification on Basescan...');
    console.log('Contract Address:', contractAddress);
    console.log('Contract Name:', contractName);
    console.log('Compiler Version:', compilerVersion);

    // Create form data
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('module', 'contract');
    form.append('action', 'verifysourcecode');
    form.append('contractaddress', contractAddress);
    form.append('sourceCode', standardJsonInput);
    form.append('codeformat', 'solidity-standard-json-input');
    form.append('contractname', contractName);
    form.append('compilerversion', compilerVersion);
    form.append('optimizationUsed', '1');
    form.append('runs', '200');
    form.append('constructorArguements', constructorArguments);
    form.append('evmversion', 'paris');
    form.append('licenseType', '3');
    form.append('apikey', process.env.BASESCAN_API_KEY);

    const response = await axios.post('https://api.basescan.org/v2/api', form, {
      headers: form.getHeaders()
    });

    console.log('\nVerification Response:');
    console.log('Status:', response.data.status);
    console.log('Message:', response.data.message);
    console.log('Result:', response.data.result);

    if (response.data.status === '1') {
      const guid = response.data.result;
      console.log('\nVerification submitted successfully!');
      console.log('GUID:', guid);
      console.log('\nChecking verification status in 5 seconds...');

      // Wait 5 seconds before checking status
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check verification status
      await checkVerificationStatus(guid);
    } else {
      console.error('\n❌ Verification failed:', response.data.result);
    }

  } catch (error) {
    console.error('\n❌ Error during verification:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

async function checkVerificationStatus(guid) {
  try {
    const response = await axios.get('https://api.basescan.org/v2/api', {
      params: {
        module: 'contract',
        action: 'checkverifystatus',
        guid: guid,
        apikey: process.env.BASESCAN_API_KEY
      }
    });

    console.log('\nVerification Status Check:');
    console.log('Status:', response.data.status);
    console.log('Message:', response.data.message);
    console.log('Result:', response.data.result);

    if (response.data.result === 'Pending in queue') {
      console.log('\nStill processing... Checking again in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await checkVerificationStatus(guid);
    } else if (response.data.result === 'Pass - Verified') {
      console.log('\n✅ Contract verified successfully!');
      console.log(`View at: https://basescan.org/address/${contractAddress}#code`);
    } else {
      console.log('\n❌ Verification result:', response.data.result);
    }

  } catch (error) {
    console.error('\n❌ Error checking status:');
    console.error('Error message:', error.message);
  }
}

// Run verification
verifyContract();
