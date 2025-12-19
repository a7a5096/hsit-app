import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import CryptoAddress from '../models/CryptoAddress.js';
import CryptoAddressService from '../services/CryptoAddressService.js';
import config from '../config/config.js';

// Load environment variables
dotenv.config();

// Initialize ECPair with secp256k1
const ECPair = ECPairFactory(ecc);

/**
 * Convert hex string to Buffer, padding if necessary
 */
function hexToBuffer(hex) {
  // Remove '0x' prefix if present
  hex = hex.replace(/^0x/, '');
  // Ensure even length
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Generate Bitcoin address from private key
 */
function getBitcoinAddress(privateKeyBuffer) {
  // Create key pair from private key
  const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, { network: bitcoin.networks.bitcoin });
  
  // Get public key
  const publicKey = keyPair.publicKey;
  
  // Generate P2PKH address (legacy address starting with '1')
  const { address } = bitcoin.payments.p2pkh({
    pubkey: publicKey,
    network: bitcoin.networks.bitcoin,
  });
  
  return address;
}

/**
 * Convert private key buffer to WIF format
 */
function privateKeyToWIF(privateKeyBuffer) {
  const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, { network: bitcoin.networks.bitcoin });
  return keyPair.toWIF();
}

/**
 * Generate 200 Bitcoin key pairs
 */
async function generateBitcoinKeyPairs() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    const baseHex = 'BADBADBADBADBADBADBADBADBADBADBADBADBADBADBADBADBADBADBADBAD';
    const keyPairs = [];
    const startIndex = 1;
    const endIndex = 200;

    console.log(`Generating ${endIndex - startIndex + 1} Bitcoin key pairs...`);
    console.log(`Base hex: ${baseHex}`);
    console.log(`Range: ${startIndex.toString(16).toUpperCase().padStart(4, '0')} to ${endIndex.toString(16).toUpperCase().padStart(4, '0')}\n`);

    // Generate key pairs
    for (let i = startIndex; i <= endIndex; i++) {
      // Create hex private key: base + padded index
      const indexHex = i.toString(16).toUpperCase().padStart(4, '0');
      const fullHex = baseHex + indexHex;
      
      // Convert to buffer (must be 32 bytes)
      const privateKeyBuffer = hexToBuffer(fullHex);
      
      // Ensure it's exactly 32 bytes
      if (privateKeyBuffer.length !== 32) {
        throw new Error(`Invalid private key length: ${privateKeyBuffer.length} bytes (expected 32)`);
      }
      
      // Convert to WIF
      const wifPrivateKey = privateKeyToWIF(privateKeyBuffer);
      
      // Generate Bitcoin address
      const address = getBitcoinAddress(privateKeyBuffer);
      
      keyPairs.push({
        hex: fullHex,
        wif: wifPrivateKey,
        address: address,
        index: i
      });
      
      if (i % 50 === 0) {
        console.log(`Generated ${i}/${endIndex} key pairs...`);
      }
    }

    console.log(`\nSuccessfully generated ${keyPairs.length} key pairs\n`);

    // Import into database
    console.log('Importing key pairs into database...');
    const addressesToImport = keyPairs.map(kp => ({
      address: kp.address,
      privateKey: kp.wif, // WIF format - will be obfuscated automatically
      currency: 'bitcoin',
      used: false
    }));

    const results = await CryptoAddressService.importAddresses(addressesToImport, 'bitcoin_keypair_batch_200');

    console.log('\n' + '='.repeat(100));
    console.log('IMPORT RESULTS');
    console.log('='.repeat(100));
    console.log(`Total: ${results.total}`);
    console.log(`Imported: ${results.imported}`);
    console.log(`Duplicates: ${results.duplicates}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(err => {
        console.log(`  - ${err.address}: ${err.error}`);
      });
    }

    // Display sample of first 5 key pairs
    console.log('\n' + '='.repeat(100));
    console.log('SAMPLE KEY PAIRS (First 5)');
    console.log('='.repeat(100));
    keyPairs.slice(0, 5).forEach((kp, idx) => {
      console.log(`\n${idx + 1}. Index: ${kp.index}`);
      console.log(`   Hex Private Key: ${kp.hex}`);
      console.log(`   WIF Private Key: ${kp.wif}`);
      console.log(`   Bitcoin Address: ${kp.address}`);
    });

    // Verify obfuscation by retrieving one from database
    console.log('\n' + '='.repeat(100));
    console.log('VERIFICATION: Checking obfuscation');
    console.log('='.repeat(100));
    if (keyPairs.length > 0) {
      const sampleAddress = keyPairs[0].address;
      const sampleWIF = keyPairs[0].wif;
      const dbRecord = await CryptoAddress.findOne({ address: sampleAddress });
      
      if (dbRecord) {
        console.log(`\nSample Address: ${sampleAddress}`);
        console.log(`Original WIF: ${sampleWIF}`);
        console.log(`Stored WIF (should be obfuscated/reversed): ${dbRecord.privateKey}`);
        console.log(`Obfuscation working: ${dbRecord.privateKey !== sampleWIF ? 'YES ✓' : 'NO ✗'}`);
        
        // Verify deobfuscation
        const deobfuscated = dbRecord.getPrivateKey();
        console.log(`Deobfuscated WIF: ${deobfuscated}`);
        console.log(`Deobfuscation working: ${deobfuscated === sampleWIF ? 'YES ✓' : 'NO ✗'}`);
      }
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    console.log('\n✓ All key pairs have been generated and imported successfully!');
    
  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
generateBitcoinKeyPairs();

