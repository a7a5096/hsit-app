/**
 * Utility functions for obfuscating/deobfuscating private keys
 * Security: Private keys are stored with reversed character order
 */

/**
 * Obfuscate a private key by reversing its characters
 * @param {string} privateKey - The original private key
 * @returns {string} - The obfuscated private key (reversed)
 */
export const obfuscatePrivateKey = (privateKey) => {
  if (!privateKey) return null;
  return privateKey.split('').reverse().join('');
};

/**
 * Deobfuscate a private key by reversing it back
 * @param {string} obfuscatedKey - The obfuscated private key
 * @returns {string} - The original private key
 */
export const deobfuscatePrivateKey = (obfuscatedKey) => {
  if (!obfuscatedKey) return null;
  return obfuscatedKey.split('').reverse().join('');
};

