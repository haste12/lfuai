const firebase = require('../config/firebase');

/**
 * GET /api/users/:userId
 */
async function getUser(req, res, next) {
  try {
    const { userId } = req.params;
    const doc = await firebase.db.collection('users').doc(userId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const data = doc.data();
    // Strip sensitive fields
    const { privateKey, ...safeData } = data;
    return res.json({ id: doc.id, ...safeData });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:userId
 * Updates allowed fields: dailyLimit, suspended, displayName
 */
async function updateUser(req, res, next) {
  try {
    const { userId } = req.params;
    const allowed = ['dailyLimit', 'suspended', 'displayName'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    await firebase.db.collection('users').doc(userId).update(updates);
    return res.json({ success: true, updated: updates });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users  (admin only)
 */
async function getAllUsers(req, res, next) {
  try {
    const snapshot = await firebase.db.collection('users').get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { getUser, updateUser, getAllUsers };
