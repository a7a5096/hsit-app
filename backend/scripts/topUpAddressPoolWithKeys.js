import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { Wallet } from 'ethers';
import CryptoAddress from '../models/CryptoAddress.js';

dotenv.config();

const ECPair = ECPairFactory(ecc);

function generateBitcoinKeyPair() {
  const keyPair = ECPair.makeRandom({ network: bitcoin.networks.bitcoin });
  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: bitcoin.networks.bitcoin
  });
  return { address, privateKey: keyPair.toWIF() };
}

function generateEthereumKeyPair() {
  const wallet = Wallet.createRandom();
  return { address: wallet.address, privateKey: wallet.privateKey };
}

async function importUniqueAddress(address, privateKey, currency) {
  const exists = await CryptoAddress.exists({ address });
  if (exists) return false;
  const record = new CryptoAddress({
    address,
    privateKey,
    currency,
    used: false,
    assignedTo: null
  });
  await record.save();
  return true;
}

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);

    const perCurrency = Number(process.env.TOPUP_COUNT || 50);
    let btcAdded = 0;
    let ethAdded = 0;
    let attempts = 0;

    while (btcAdded < perCurrency || ethAdded < perCurrency) {
      attempts += 1;
      if (attempts > perCurrency * 20) break;

      if (btcAdded < perCurrency) {
        const btc = generateBitcoinKeyPair();
        const inserted = await importUniqueAddress(btc.address, btc.privateKey, 'bitcoin');
        if (inserted) btcAdded += 1;
      }

      if (ethAdded < perCurrency) {
        const eth = generateEthereumKeyPair();
        const inserted = await importUniqueAddress(eth.address, eth.privateKey, 'ethereum');
        if (inserted) ethAdded += 1;
      }
    }

    console.log(`Added BTC addresses: ${btcAdded}`);
    console.log(`Added ETH addresses: ${ethAdded}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();

