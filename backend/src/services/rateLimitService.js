const firebase = require('../config/firebase');

const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours in ms

/**
 * Checks the user's daily message limit and increments count if allowed.
 * @param {string} userId
 * @returns {{ allowed: boolean, message: string }}
 */
async function checkAndIncrementLimit(userId) {
  const userRef = firebase.db.collection('users').doc(userId);

  const userDoc = await userRef.get();

  // ── Auto-create Firestore doc for legacy users (from old system) ──────────
  if (!userDoc.exists) {
    await userRef.set({
      dailyLimit: 20,
      messageCount: 1,
      suspended: false,
      lastResetTime: new Date(),
      createdAt: new Date(),
      role: 'user',
      migrated: true, // flag so you can identify legacy users in admin
    });
    return { allowed: true, message: 'Messages remaining today: 19 | Resets in 24h 0m' };
  }

  const userData = userDoc.data();
  const now = Date.now();

  // Check suspension
  if (userData.suspended) {
    return { allowed: false, message: 'Your account has been suspended.' };
  }

  // Unlimited users
  const dailyLimit = userData.dailyLimit ?? null;
  if (dailyLimit === null) {
    return { allowed: true, message: 'Unlimited messages' };
  }

  // Determine last reset
  const lastResetTs = userData.lastResetTime?.toMillis?.() ?? now;
  let messageCount = userData.messageCount ?? 0;

  // Reset if 24 hours have passed
  if (now - lastResetTs >= RESET_INTERVAL_MS) {
    messageCount = 0;
    await userRef.update({
      messageCount: 1,
      lastResetTime: new Date(now),
    });
    const remaining = dailyLimit - 1;
    return {
      allowed: true,
      message: `Messages remaining today: ${remaining} | Resets in 24h 0m`,
    };
  }

  // Check limit
  if (messageCount >= dailyLimit) {
    const timeLeft = lastResetTs + RESET_INTERVAL_MS - now;
    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    return {
      allowed: false,
      message: `Daily message limit reached. Resets in ${hours}h ${minutes}m`,
    };
  }

  // Increment count
  const newCount = messageCount + 1;
  await userRef.update({ messageCount: newCount });

  const remaining = dailyLimit - newCount;
  const timeLeft = lastResetTs + RESET_INTERVAL_MS - now;
  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);

  return {
    allowed: true,
    message: `Messages remaining today: ${remaining} | Resets in ${hours}h ${minutes}m`,
  };
}

/**
 * Gets remaining message info without incrementing.
 */
async function getRemainingInfo(userId) {
  const userRef = firebase.db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) return { remaining: 20, hoursUntilReset: 24, minutesUntilReset: 0, message: 'Messages remaining: 20' };

  const userData = userDoc.data();
  const now = Date.now();

  const dailyLimit = userData.dailyLimit ?? null;
  if (dailyLimit === null) {
    return { remaining: null, hoursUntilReset: 0, minutesUntilReset: 0, message: 'Unlimited' };
  }

  const lastResetTs = userData.lastResetTime?.toMillis?.() ?? now;
  let messageCount = userData.messageCount ?? 0;

  if (now - lastResetTs >= RESET_INTERVAL_MS) {
    messageCount = 0;
    await userRef.update({ messageCount: 0, lastResetTime: new Date(now) });
  }

  const remaining = Math.max(0, dailyLimit - messageCount);
  const timeLeft = lastResetTs + RESET_INTERVAL_MS - now;
  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);

  return {
    remaining,
    hoursUntilReset: hours,
    minutesUntilReset: minutes,
    message: `Messages remaining: ${remaining} | Resets in ${hours}h ${minutes}m`,
  };
}

module.exports = { checkAndIncrementLimit, getRemainingInfo };
