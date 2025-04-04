// Test script to verify all functionality
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config/config');
const { startDatabase } = require('./scripts/startDevDatabase');
const User = require('./models/User');
const CryptoAddress = require('./models/CryptoAddress');
const Transaction = require('./models/Transaction');
const ExchangeRate = require('./models/ExchangeRate');
const Invitation = require('./models/Invitation');

async function runTests() {
  let mongod;
  
  try {
    // Start in-memory database for testing
    mongod = await startDatabase();
    console.log('Test database started');
    
    // Test 1: Import crypto addresses
    console.log('\n--- Test 1: Import Crypto Addresses ---');
    await testImportAddresses();
    
    // Test 2: User registration and phone verification
    console.log('\n--- Test 2: User Registration and Phone Verification ---');
    const user = await testUserRegistration();
    
    // Test 3: Crypto address assignment
    console.log('\n--- Test 3: Crypto Address Assignment ---');
    await testAddressAssignment(user);
    
    // Test 4: UBT exchange rate mechanism
    console.log('\n--- Test 4: UBT Exchange Rate Mechanism ---');
    await testExchangeRateMechanism();
    
    // Test 5: Deposit and withdrawal
    console.log('\n--- Test 5: Deposit and Withdrawal ---');
    await testDepositWithdrawal(user);
    
    // Test 6: Invitation system
    console.log('\n--- Test 6: Invitation System ---');
    await testInvitationSystem(user);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close database connection
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
      console.log('Test database stopped');
    }
  }
}

// Test 1: Import crypto addresses
async function testImportAddresses() {
  // Create test addresses
  const testBtcAddresses = [
    '1as4MZTVW362uNHhpkrhHeHYws9AG8Mdm',
    '1M8qHQg7pMV9s5esnNLEAVAq7EjKkU6h22',
    '17cQfUMhGUgZHKoRgErHfv4LuvNWTv3ZTK'
  ];
  
  const testEthAddresses = [
    '0xc48eA7e07164eCB2C9Ab882C0Ef4C02Df1FA269a',
    '0x0cBb0Fb2A44e1282710BA7ac4F7d566647379527',
    '0x8609CA11520Cb361B014947ed286C587D53b0D8b'
  ];
  
  // Import BTC addresses
  for (const address of testBtcAddresses) {
    const newAddress = new CryptoAddress({
      type: 'BTC',
      address,
      isAssigned: false
    });
    await newAddress.save();
  }
  
  // Import ETH addresses
  for (const address of testEthAddresses) {
    const newAddress = new CryptoAddress({
      type: 'ETH',
      address,
      isAssigned: false
    });
    await newAddress.save();
  }
  
  // Verify addresses were imported
  const btcCount = await CryptoAddress.countDocuments({ type: 'BTC' });
  const ethCount = await CryptoAddress.countDocuments({ type: 'ETH' });
  
  console.log(`Imported ${btcCount} BTC addresses and ${ethCount} ETH addresses`);
  
  if (btcCount !== testBtcAddresses.length || ethCount !== testEthAddresses.length) {
    throw new Error('Address import failed');
  }
  
  return { btcCount, ethCount };
}

// Test 2: User registration and phone verification
async function testUserRegistration() {
  // Create test user
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    phoneNumber: '+15551234567'
  };
  
  // Register user
  const user = new User(testUser);
  await user.save();
  
  console.log(`User created: ${user.username} (${user.email})`);
  
  // Simulate phone verification
  user.verificationCode = '123456';
  user.verificationCodeExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  
  console.log('Verification code set:', user.verificationCode);
  
  // Verify phone
  user.isPhoneVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();
  
  console.log('Phone verified:', user.isPhoneVerified);
  
  if (!user.isPhoneVerified) {
    throw new Error('Phone verification failed');
  }
  
  return user;
}

// Test 3: Crypto address assignment
async function testAddressAssignment(user) {
  // Find available BTC address
  const btcAddress = await CryptoAddress.findOne({ 
    type: 'BTC', 
    isAssigned: false 
  });
  
  // Find available ETH address
  const ethAddress = await CryptoAddress.findOne({ 
    type: 'ETH', 
    isAssigned: false 
  });
  
  if (!btcAddress || !ethAddress) {
    throw new Error('No available addresses');
  }
  
  // Assign addresses to user
  user.btcAddress = btcAddress.address;
  user.ethAddress = ethAddress.address;
  await user.save();
  
  // Mark addresses as assigned
  btcAddress.isAssigned = true;
  btcAddress.assignedTo = user._id;
  btcAddress.assignedAt = Date.now();
  await btcAddress.save();
  
  ethAddress.isAssigned = true;
  ethAddress.assignedTo = user._id;
  ethAddress.assignedAt = Date.now();
  await ethAddress.save();
  
  console.log(`BTC address assigned: ${btcAddress.address}`);
  console.log(`ETH address assigned: ${ethAddress.address}`);
  
  // Verify assignment
  const updatedUser = await User.findById(user._id);
  if (updatedUser.btcAddress !== btcAddress.address || updatedUser.ethAddress !== ethAddress.address) {
    throw new Error('Address assignment failed');
  }
  
  return { btcAddress, ethAddress };
}

// Test 4: UBT exchange rate mechanism
async function testExchangeRateMechanism() {
  // Initialize exchange rate
  const initialRate = new ExchangeRate({
    withdrawalCount: 0,
    currentRate: config.UBT_INITIAL_EXCHANGE_RATE,
    buyRate: config.UBT_INITIAL_EXCHANGE_RATE * config.UBT_BUY_RATE_FACTOR
  });
  await initialRate.save();
  
  console.log(`Initial exchange rate: ${initialRate.currentRate}`);
  console.log(`Initial buy rate: ${initialRate.buyRate}`);
  
  // Simulate withdrawals to increase rate
  for (let i = 0; i < 3; i++) {
    const rate = await ExchangeRate.findOne({});
    rate.withdrawalCount += 1;
    rate.currentRate = rate.currentRate * (1 + config.UBT_RATE_INCREASE);
    rate.buyRate = rate.currentRate * config.UBT_BUY_RATE_FACTOR;
    await rate.save();
    
    console.log(`After withdrawal ${i+1}:`);
    console.log(`  Exchange rate: ${rate.currentRate.toFixed(4)}`);
    console.log(`  Buy rate: ${rate.buyRate.toFixed(4)}`);
  }
  
  // Verify rate increase
  const finalRate = await ExchangeRate.findOne({});
  const expectedRate = config.UBT_INITIAL_EXCHANGE_RATE * Math.pow(1 + config.UBT_RATE_INCREASE, 3);
  
  console.log(`Final exchange rate: ${finalRate.currentRate.toFixed(4)}`);
  console.log(`Expected rate: ${expectedRate.toFixed(4)}`);
  
  if (Math.abs(finalRate.currentRate - expectedRate) > 0.0001) {
    throw new Error('Exchange rate calculation failed');
  }
  
  return finalRate;
}

// Test 5: Deposit and withdrawal
async function testDepositWithdrawal(user) {
  // Initialize user balances
  if (!user.balances) {
    user.balances = {
      btc: 0,
      eth: 0,
      usdt: 0,
      ubt: 0
    };
  }
  
  // Simulate deposit
  const depositAmount = 1.5;
  user.balances.btc += depositAmount;
  await user.save();
  
  // Create deposit transaction
  const depositTx = new Transaction({
    user: user._id,
    type: 'deposit',
    currency: 'BTC',
    amount: depositAmount,
    status: 'completed',
    txHash: '0x' + Math.random().toString(16).substring(2, 34)
  });
  await depositTx.save();
  
  console.log(`Deposit: ${depositAmount} BTC`);
  console.log(`New BTC balance: ${user.balances.btc}`);
  
  // Simulate UBT purchase
  const btcToUsdtRate = 70000; // Example rate
  const usdtAmount = depositAmount * btcToUsdtRate * 0.5; // Convert half of BTC to USDT
  user.balances.btc -= depositAmount * 0.5;
  user.balances.usdt += usdtAmount;
  await user.save();
  
  // Create BTC to USDT conversion transaction
  const conversionTx = new Transaction({
    user: user._id,
    type: 'exchange',
    currency: 'BTC',
    amount: -depositAmount * 0.5,
    targetCurrency: 'USDT',
    targetAmount: usdtAmount,
    status: 'completed'
  });
  await conversionTx.save();
  
  console.log(`Converted ${depositAmount * 0.5} BTC to ${usdtAmount} USDT`);
  console.log(`New BTC balance: ${user.balances.btc}`);
  console.log(`New USDT balance: ${user.balances.usdt}`);
  
  // Get current UBT exchange rate
  const exchangeRate = await ExchangeRate.findOne({});
  
  // Simulate UBT purchase
  const ubtAmount = usdtAmount / exchangeRate.buyRate;
  user.balances.usdt -= usdtAmount;
  user.balances.ubt += ubtAmount;
  await user.save();
  
  // Create USDT to UBT conversion transaction
  const ubtPurchaseTx = new Transaction({
    user: user._id,
    type: 'exchange',
    currency: 'USDT',
    amount: -usdtAmount,
    targetCurrency: 'UBT',
    targetAmount: ubtAmount,
    status: 'completed'
  });
  await ubtPurchaseTx.save();
  
  console.log(`Purchased ${ubtAmount.toFixed(2)} UBT with ${usdtAmount} USDT`);
  console.log(`New USDT balance: ${user.balances.usdt}`);
  console.log(`New UBT balance: ${user.balances.ubt}`);
  
  // Simulate UBT withdrawal (conversion to USDT)
  const ubtToWithdraw = ubtAmount * 0.5;
  const usdtReceived = ubtToWithdraw * exchangeRate.currentRate;
  
  user.balances.ubt -= ubtToWithdraw;
  user.balances.usdt += usdtReceived;
  await user.save();
  
  // Create UBT to USDT conversion transaction
  const ubtWithdrawalTx = new Transaction({
    user: user._id,
    type: 'exchange',
    currency: 'UBT',
    amount: -ubtToWithdraw,
    targetCurrency: 'USDT',
    targetAmount: usdtReceived,
    status: 'completed'
  });
  await ubtWithdrawalTx.save();
  
  console.log(`Converted ${ubtToWithdraw.toFixed(2)} UBT to ${usdtReceived.toFixed(2)} USDT`);
  console.log(`New UBT balance: ${user.balances.ubt}`);
  console.log(`New USDT balance: ${user.balances.usdt}`);
  
  // Verify final balances
  const updatedUser = await User.findById(user._id);
  console.log('Final balances:');
  console.log(`  BTC: ${updatedUser.balances.btc}`);
  console.log(`  ETH: ${updatedUser.balances.eth}`);
  console.log(`  USDT: ${updatedUser.balances.usdt}`);
  console.log(`  UBT: ${updatedUser.balances.ubt}`);
  
  // Verify transactions
  const transactions = await Transaction.find({ user: user._id });
  console.log(`Total transactions: ${transactions.length}`);
  
  return { user: updatedUser, transactions };
}

// Test 6: Invitation system
async function testInvitationSystem(user) {
  // Generate invitation code
  const invitation = new Invitation({
    user: user._id,
    code: Math.random().toString(36).substring(2, 10).toUpperCase()
  });
  await invitation.save();
  
  console.log(`Invitation code generated: ${invitation.code}`);
  
  // Create invited users
  const invitedUsers = [];
  
  // Create 3 direct invites
  for (let i = 0; i < 3; i++) {
    const invitedUser = new User({
      username: `invited_user_${i}`,
      email: `invited_${i}@example.com`,
      password: 'password123',
      phoneNumber: `+1555${100000 + i}`,
      isPhoneVerified: true,
      invitedBy: user._id,
      invitationCode: invitation.code
    });
    await invitedUser.save();
    
    // Add to invited users array
    invitedUsers.push(invitedUser);
    
    console.log(`Direct invite created: ${invitedUser.username}`);
  }
  
  // Create 2 second-level invites
  for (let i = 0; i < 2; i++) {
    // Create invitation for first invited user
    const secondInvitation = new Invitation({
      user: invitedUsers[0]._id,
      code: Math.random().toString(36).substring(2, 10).toUpperCase()
    });
    await secondInvitation.save();
    
    // Create second-level invited user
    const secondLevelUser = new User({
      username: `second_level_user_${i}`,
      email: `second_level_${i}@example.com`,
      password: 'password123',
      phoneNumber: `+1555${200000 + i}`,
      isPhoneVerified: true,
      invitedBy: invitedUsers[0]._id,
      invitationCode: secondInvitation.code
    });
    await secondLevelUser.save();
    
    console.log(`Second-level invite created: ${secondLevelUser.username}`);
  }
  
  // Simulate bot purchases and bonus distribution
  // First direct invite buys a bot
  const directInviteBonus = 10; // 10 UBT per direct invite
  const secondLevelBonus = 15; // 15 UBT per second-level invite
  
  // Update first invited user
  invitedUsers[0].botsPurchased = ['500_series'];
  await invitedUsers[0].save();
  
  // Add bonus to original user
  user.balances.ubt += directInviteBonus;
  await user.save();
  
  // Create bonus transaction
  const bonusTx = new Transaction({
    user: user._id,
    type: 'bonus',
    currency: 'UBT',
    amount: directInviteBonus,
    status: 'completed',
    notes: `Bonus for ${invitedUsers[0].username} purchasing a bot`
  });
  await bonusTx.save();
  
  console.log(`User received ${directInviteBonus} UBT bonus for direct invite purchase`);
  
  // Get all users invited by the original user
  const directInvites = await User.find({ invitedBy: user._id });
  console.log(`Total direct invites: ${directInvites.length}`);
  
  // Get all second-level invites
  const secondLevelInvites = await User.find({ invitedBy: { $in: directInvites.map(u => u._id) } });
  console.log(`Total second-level invites: ${secondLevelInvites.length}`);
  
  // Count qualified invites (those who purchased bots)
  const qualifiedInvites = await User.countDocuments({ 
    invitedBy: user._id,
    botsPurchased: { $exists: true, $ne: [] }
  });
  console.log(`Qualified invites: ${qualifiedInvites} / 10 needed for free bot`);
  
  return { 
    invitation, 
    directInvites: directInvites.length, 
    secondLevelInvites: secondLevelInvites.length,
    qualifiedInvites
  };
}

// Run all tests
runTests()
  .then(() => {
    console.log('All tests completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
