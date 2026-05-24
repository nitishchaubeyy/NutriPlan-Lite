const express = require('express');
const {
  register,
  login,
  logout
} = require('../controllers/auth');
const {
  getProfile,
  updateProfile
} = require('../controllers/profile');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate
} = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes (Rate Limited)
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);

// Public routes (No rate limiting needed)
router.post('/logout', logout);

// Protected routes (Require valid token header)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateProfileUpdate, updateProfile);

module.exports = router;
