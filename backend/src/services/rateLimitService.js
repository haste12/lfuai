const firebase = require('../config/firebase');

/**
 * Checks the user's daily message limit and increments count if allowed.
 * @param {string} userId
 * @returns {{ allowed: boolean, message: string }}
 */
async function checkAndIncrementLimit(userId) {
  // Completely removed the limit restriction! All users have unlimited messages.
  return { allowed: true, message: 'Unlimited messages' };
}

/**
 * Gets remaining message info without incrementing.
 */
async function getRemainingInfo(userId) {
  // Always return unlimited
  return { remaining: 999999, hoursUntilReset: 0, minutesUntilReset: 0, message: 'Unlimited messages' };
}

module.exports = { checkAndIncrementLimit, getRemainingInfo };
