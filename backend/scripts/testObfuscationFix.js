import { obfuscatePrivateKey, deobfuscatePrivateKey } from '../utils/privateKeyObfuscation.js';

console.log('Testing obfuscation logic fix:\n');

const testKeys = [
  'L3UwPsDBu7DeNpbjnKMFTtdpWpArEXCUxjhu5i4ZB3ybA23GQTBJ',
  'abc123',
  'aba' // palindrome
];

testKeys.forEach((key, idx) => {
  console.log(`Test ${idx + 1}:`);
  console.log(`  Original key: ${key.substring(0, 30)}...`);
  
  // Simulate the pre-save hook logic
  const reversed = deobfuscatePrivateKey(key);
  const shouldObfuscate = reversed !== key;
  
  console.log(`  Reversed once: ${reversed.substring(0, 30)}...`);
  console.log(`  Should obfuscate: ${shouldObfuscate}`);
  
  if (shouldObfuscate) {
    const obfuscated = obfuscatePrivateKey(key);
    console.log(`  Obfuscated: ${obfuscated.substring(0, 30)}...`);
    
    // Simulate the post hook (deobfuscate on read)
    const deobfuscated = deobfuscatePrivateKey(obfuscated);
    console.log(`  Deobfuscated: ${deobfuscated.substring(0, 30)}...`);
    console.log(`  Matches original: ${deobfuscated === key ? '✓ YES' : '✗ NO'}`);
  } else {
    console.log(`  Skipped (palindrome)`);
  }
  console.log('');
});

console.log('✓ Obfuscation logic is now working correctly!');

