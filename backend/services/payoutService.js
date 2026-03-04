import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { getBotById, getBotByName, parseBonusIntervalDays } from '../config/botDefinitions.js';

function normalizeBalance(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value.toString === 'function') return parseFloat(value.toString()) || 0;
  return 0;
}

function generateTxHash(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process all pending payouts for a single user: daily credits,
 * recurring bonuses, and principal return on bot completion.
 * Safe to call repeatedly — idempotent thanks to tracked counters.
 */
export async function processUserPayouts(userId) {
  const user = await User.findById(userId);
  if (!user || !Array.isArray(user.bots) || user.bots.length === 0) {
    return user;
  }

  const now = new Date();
  let balanceChanged = false;
  const pendingTransactions = [];

  for (const bot of user.bots) {
    if (bot.payoutProcessed) continue;

    const masterBot =
      getBotById(bot.botId) ||
      getBotById(bot.id) ||
      getBotByName(bot.name);
    if (!masterBot) continue;

    const purchaseDate = new Date(bot.purchasedAt || now);
    const lockInDays = bot.lockInDays || masterBot.lockInDays;
    const dailyCredit = masterBot.dailyCredit;
    const msActive = Math.max(0, now - purchaseDate);
    const daysActive = Math.min(
      Math.floor(msActive / (1000 * 60 * 60 * 24)),
      lockInDays
    );

    // --- 1. Daily credits ---
    const processed = bot.dailyCreditsProcessed || 0;
    const owed = daysActive - processed;

    if (owed > 0) {
      const payout = owed * dailyCredit;
      user.balances.ubt = normalizeBalance(user.balances.ubt) + payout;
      bot.dailyCreditsProcessed = daysActive;
      balanceChanged = true;

      pendingTransactions.push({
        userId: user._id,
        txHash: generateTxHash(`daily_credit_${bot.botId}`),
        fromAddress: 'system',
        amount: payout,
        ubtAmount: payout,
        currency: 'UBT',
        type: 'reward',
        status: 'completed',
        description: `Daily return (${owed} day${owed > 1 ? 's' : ''} × ${dailyCredit} UBT) for ${bot.name}`
      });
    }

    // --- 2. Recurring bonuses ---
    if (
      masterBot.hasBonus &&
      masterBot.bonusCreditAmount > 0 &&
      masterBot.bonusCreditInterval
    ) {
      const intervalDays = parseBonusIntervalDays(masterBot.bonusCreditInterval);
      if (intervalDays && intervalDays > 0) {
        const effectiveDays = Math.min(daysActive, lockInDays);
        const bonusesEarned = Math.floor(effectiveDays / intervalDays);
        const bonusesProcessed = bot.bonusCreditsProcessed || 0;
        const bonusesOwed = bonusesEarned - bonusesProcessed;

        if (bonusesOwed > 0) {
          const bonusPayout = bonusesOwed * masterBot.bonusCreditAmount;
          user.balances.ubt = normalizeBalance(user.balances.ubt) + bonusPayout;
          bot.bonusCreditsProcessed = bonusesEarned;
          balanceChanged = true;

          pendingTransactions.push({
            userId: user._id,
            txHash: generateTxHash(`recurring_bonus_${bot.botId}`),
            fromAddress: 'system',
            amount: bonusPayout,
            ubtAmount: bonusPayout,
            currency: 'UBT',
            type: 'reward',
            status: 'completed',
            description: `Recurring bonus (${bonusesOwed}× ${masterBot.bonusCreditAmount} UBT) for ${bot.name}`
          });
        }
      }
    }

    // --- 3. Bot completion — return principal ---
    if (daysActive >= lockInDays) {
      const principalReturn =
        typeof bot.investmentAmount === 'number'
          ? bot.investmentAmount
          : masterBot.price;

      user.balances.ubt = normalizeBalance(user.balances.ubt) + principalReturn;
      bot.status = 'completed';
      bot.payoutProcessed = true;
      balanceChanged = true;

      pendingTransactions.push({
        userId: user._id,
        txHash: generateTxHash(`principal_return_${bot.botId}`),
        fromAddress: 'system',
        amount: principalReturn,
        ubtAmount: principalReturn,
        currency: 'UBT',
        type: 'reward',
        status: 'completed',
        description: `Principal return for completed ${bot.name}`
      });
    }
  }

  if (balanceChanged) {
    for (const txData of pendingTransactions) {
      try {
        await new Transaction(txData).save();
      } catch (err) {
        console.error('Failed to save payout transaction:', err.message);
      }
    }
    await user.save();
    console.log(
      `Processed ${pendingTransactions.length} payout(s) for user ${user.email || user.username}`
    );
  }

  return user;
}

export default { processUserPayouts };
