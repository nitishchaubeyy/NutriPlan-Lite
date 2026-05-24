const foodLogService = require('../services/foodLog');
const { AppError } = require('../middleware/error');

/**
 * GET /api/v1/food-logs
 * Retrieves the user's food logs, with optional date filtering.
 */
const getFoodLogs = async (req, res, next) => {
  try {
    const { date } = req.query;
    const foodLogs = await foodLogService.getFoodLogsByUserId(req.user.id, date);

    res.status(200).json({
      status: 'success',
      results: foodLogs.length,
      data: {
        foodLogs
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/food-logs
 * Creates a new food log entry.
 */
const createFoodLog = async (req, res, next) => {
  try {
    const newEntry = await foodLogService.createFoodLogEntry(req.user.id, req.body);

    res.status(201).json({
      status: 'success',
      data: {
        foodLog: newEntry
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/food-logs/:id
 * Updates an existing food log entry.
 */
const updateFoodLog = async (req, res, next) => {
  try {
    const updatedEntry = await foodLogService.updateFoodLogEntry(
      req.user.id,
      req.params.id,
      req.body
    );

    if (!updatedEntry) {
      return next(new AppError('Food log entry not found or unauthorized.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        foodLog: updatedEntry
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/food-logs/:id
 * Deletes an existing food log entry.
 */
const deleteFoodLog = async (req, res, next) => {
  try {
    const deleted = await foodLogService.deleteFoodLogEntry(req.user.id, req.params.id);

    if (!deleted) {
      return next(new AppError('Food log entry not found or unauthorized.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFoodLogs,
  createFoodLog,
  updateFoodLog,
  deleteFoodLog
};
