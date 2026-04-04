const express = require('express');
const router = express.Router();
const { getUser, updateUser, getAllUsers } = require('../controllers/userController');

// GET /api/users
router.get('/', getAllUsers);

// GET /api/users/:userId
router.get('/:userId', getUser);

// PUT /api/users/:userId
router.put('/:userId', updateUser);

module.exports = router;
