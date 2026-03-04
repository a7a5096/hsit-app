import { Wallet } from 'ethers';
import CryptoAddress from '../models/CryptoAddress.js';
import { obfuscatePrivateKey } from '../utils/privateKeyObfuscation.js';

/**
 * KeyManagementService - Handles generation and storage of Ethereum keypairs.
 * Uses ethers.js for secure generation and standardizes storage in the database.
 */
class KeyManagementService {
    /**
     * Generate a new Ethereum keypair using ethers.js
     * @returns {Object} { address, privateKey }
     */
    generateEthKeypair() {
        const wallet = Wallet.createRandom();
        return {
            address: wallet.address,
            privateKey: wallet.privateKey
        };
    }

    /**
     * Generate and store a pool of Ethereum addresses in the database.
     * @param {number} count - Number of addresses to generate
     * @returns {Promise<Array>} - List of stored address documents
     */
    async generateAndStorePool(count = 50) {
        const storedAddresses = [];
        
        for (let i = 0; i < count; i++) {
            const { address, privateKey } = this.generateEthKeypair();
            
            // Standardize: Ethereum addresses are used for ETH, USDT, and UBT
            const newAddress = new CryptoAddress({
                address: address,
                privateKey: privateKey, // Model handles obfuscation via pre-save hook
                currency: 'ethereum',
                used: false,
                assignedTo: null
            });

            await newAddress.save();
            storedAddresses.push(newAddress);
        }

        console.log(`Generated and stored ${storedAddresses.length} new Ethereum addresses in the pool.`);
        return storedAddresses;
    }

    /**
     * Get an available address from the pool and mark it as used.
     * @param {string} userId - The user ID to assign the address to
     * @param {mongoose.ClientSession} session - Optional MongoDB session for transactions
     * @returns {Promise<Object>} - The assigned address document
     */
    async assignFromPool(userId, session = null) {
        let addressDoc = await CryptoAddress.findOneAndUpdate(
            { 
                currency: 'ethereum', 
                used: false, 
                assignedTo: null 
            },
            { 
                $set: { 
                    used: true, 
                    assignedTo: userId, 
                    assignedAt: new Date() 
                } 
            },
            { 
                new: true, 
                session,
                sort: { createdAt: 1 } 
            }
        );

        // If pool is empty, generate a new one on the fly (best practice to never block)
        if (!addressDoc) {
            console.log('Pool empty, generating new address on the fly...');
            const { address, privateKey } = this.generateEthKeypair();
            addressDoc = new CryptoAddress({
                address: address,
                privateKey: privateKey,
                currency: 'ethereum',
                used: true,
                assignedTo: userId,
                assignedAt: new Date()
            });
            await addressDoc.save({ session });
        }

        return addressDoc;
    }
}

export default new KeyManagementService();
