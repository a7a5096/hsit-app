const bots = [
  { id: 1, name: "Starter UBT Bot", price: 100, lockInDays: 2, dailyCredit: 1, hasBonus: false, bonusCreditAmount: 0, bonusCreditInterval: null, specialFeature: "Ideal for new investors to understand bot operations.", totalReturnAmount: 102, totalProfit: 2, profitRatio: 0.02 },
  { id: 2, name: "UBT Bot #2", price: 200, lockInDays: 4, dailyCredit: 3, hasBonus: false, bonusCreditAmount: 0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 212, totalProfit: 12, profitRatio: 0.06 },
  { id: 3, name: "UBT Bot #3", price: 600, lockInDays: 8, dailyCredit: 6, hasBonus: true, bonusCreditAmount: 20, bonusCreditInterval: "every 120 days", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 648, totalProfit: 48, profitRatio: 0.08 },
  { id: 4, name: "UBT Bot #4", price: 1300, lockInDays: 16, dailyCredit: 10, hasBonus: false, bonusCreditAmount: 0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 1460, totalProfit: 160, profitRatio: 0.123 },
  { id: 5, name: "UBT Bot #5", price: 3200, lockInDays: 32, dailyCredit: 15, hasBonus: false, bonusCreditAmount: 0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 3680, totalProfit: 480, profitRatio: 0.15 },
  { id: 6, name: "UBT Bot #6", price: 7500, lockInDays: 64, dailyCredit: 21, hasBonus: true, bonusCreditAmount: 60, bonusCreditInterval: "every 120 days", specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 8844, totalProfit: 1344, profitRatio: 0.179 },
  { id: 7, name: "UBT Bot #7", price: 17800, lockInDays: 128, dailyCredit: 28, hasBonus: false, bonusCreditAmount: 0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 21384, totalProfit: 3584, profitRatio: 0.201 },
  { id: 8, name: "UBT Bot #8", price: 42200, lockInDays: 256, dailyCredit: 36, hasBonus: false, bonusCreditAmount: 0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 51424, totalProfit: 9224, profitRatio: 0.219 },
  { id: 9, name: "UBT Bot #9", price: 100000, lockInDays: 512, dailyCredit: 45, hasBonus: true, bonusCreditAmount: 200, bonusCreditInterval: "every 120 days", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 123040, totalProfit: 23040, profitRatio: 0.23 },
  { id: 10, name: "VIP Elite UBT Bot", price: 100000, lockInDays: 1024, dailyCredit: 55, hasBonus: true, bonusCreditAmount: 400, bonusCreditInterval: "every 90 days", specialFeature: "Dedicated VIP investment consultant for priority support and optimal returns.", totalReturnAmount: 156320, totalProfit: 56320, profitRatio: 0.563 }
];

export function getBotById(id) {
  return bots.find(bot => String(bot.id) === String(id));
}

export function getBotByName(name) {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  return bots.find(bot => String(bot.name).trim().toLowerCase() === normalized) || null;
}

export function getSpringBonusAmount(bot) {
  if (!bot || !bot.hasBonus) return 0;
  return Math.round(bot.price * 0.2);
}

export function parseBonusIntervalDays(interval) {
  if (!interval) return null;
  const match = interval.match(/every\s+(\d+)\s+days/i);
  return match ? parseInt(match[1]) : null;
}

export { bots };
