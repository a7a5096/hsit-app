// Test script to verify prize distribution changes

const createPrizePool = () => {
    const prizes = [];
    
    // 1 Grand Prize (1%)
    prizes.push({ name: "A.I. BOT #5", type: "bot" });
    
    // 4 10x Wins (4%) - Reduced by 50% from 9 (was 9%, now 4%)
    for (let i = 0; i < 4; i++) {
        prizes.push({ name: "10x Win", multiplier: 10 });
    }
    
    // 21 2x Wins (21%) - Same as before
    for (let i = 0; i < 21; i++) {
        prizes.push({ name: "2x Win", multiplier: 2 });
    }
    
    // 35 1x Wins (35%) - Same as before
    for (let i = 0; i < 35; i++) {
        prizes.push({ name: "1x Win", multiplier: 1 });
    }
    
    // 39 Loses (39%) - Increased from 34 to compensate for reduced 10x wins (added 5 more)
    for (let i = 0; i < 39; i++) {
        prizes.push({ name: "Lose", multiplier: 0 });
    }
    
    return prizes;
};

const pool = createPrizePool();
console.log('='.repeat(60));
console.log('PRIZE DISTRIBUTION VERIFICATION');
console.log('='.repeat(60));
console.log(`Total prizes: ${pool.length}\n`);

const counts = {};
pool.forEach(p => {
    counts[p.name] = (counts[p.name] || 0) + 1;
});

console.log('Prize Distribution:');
Object.keys(counts).forEach(k => {
    const count = counts[k];
    const percentage = (count / 100 * 100).toFixed(1);
    console.log(`  ${k}: ${count} (${percentage}%)`);
});

console.log('\n' + '='.repeat(60));
console.log('CHANGES SUMMARY');
console.log('='.repeat(60));
console.log('Before:');
console.log('  10x Win: 9 (9%)');
console.log('  Lose: 34 (34%)');
console.log('\nAfter:');
console.log('  10x Win: 4 (4%) - Reduced by 50%+');
console.log('  Lose: 39 (39%) - Increased by 5 to compensate');
console.log('\nOther prizes remain unchanged:');
console.log('  A.I. BOT #5: 1 (1%)');
console.log('  2x Win: 21 (21%)');
console.log('  1x Win: 35 (35%)');
console.log('='.repeat(60));

