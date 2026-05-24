const express = require('express');
const {
  getWaterLogs,
  createWaterLog,
  resetWaterLogs,
  deleteWaterLog
} = require('../controllers/waterLog');
const { protect } = require('../middleware/auth');
const { validateWaterLog } = require('../middleware/validation');

const router = express.Router();

// Secure all water log routes with JWT middleware
router.use(protect);

router.route('/')
  .get(getWaterLogs)
  .post(validateWaterLog, createWaterLog);

router.delete('/reset', resetWaterLogs);

router.delete('/:id', deleteWaterLog);

module.exports = router;
