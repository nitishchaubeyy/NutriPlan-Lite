const express = require('express');
const {
  getFoodLogs,
  createFoodLog,
  updateFoodLog,
  deleteFoodLog
} = require('../controllers/foodLog');
const { protect } = require('../middleware/auth');
const { validateFoodLog } = require('../middleware/validation');

const router = express.Router();

// Secure all food log routes with JWT middleware
router.use(protect);

router.route('/')
  .get(getFoodLogs)
  .post(validateFoodLog, createFoodLog);

router.route('/:id')
  .put(validateFoodLog, updateFoodLog)
  .delete(deleteFoodLog);

module.exports = router;
