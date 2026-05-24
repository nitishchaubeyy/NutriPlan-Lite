const db = require('../config/db');

/**
 * Retrieves food log entries for a user, optionally filtered by log_date.
 */
const getFoodLogsByUserId = async (userId, date = null) => {
  let queryText = `
    SELECT id, user_id, log_date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type, created_at 
    FROM food_logs 
    WHERE user_id = $1
  `;
  const queryParams = [userId];

  if (date) {
    queryText += ' AND log_date = $2';
    queryParams.push(date);
  }

  queryText += ' ORDER BY created_at DESC';

  const result = await db.query(queryText, queryParams);
  return result.rows;
};

/**
 * Creates a new food log entry.
 */
const createFoodLogEntry = async (userId, logData) => {
  const {
    id,
    food_name,
    quantity_grams,
    calories,
    protein,
    carbs,
    fat,
    meal_type,
    log_date
  } = logData;

  let queryText;
  let queryParams;

  if (id) {
    queryText = `
      INSERT INTO food_logs 
        (id, user_id, food_name, quantity_grams, calories, protein, carbs, fat, meal_type, log_date) 
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, CURRENT_DATE)) 
      RETURNING id, user_id, log_date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type, created_at
    `;
    queryParams = [
      id,
      userId,
      food_name,
      quantity_grams,
      calories,
      protein,
      carbs,
      fat,
      meal_type,
      log_date || null
    ];
  } else {
    queryText = `
      INSERT INTO food_logs 
        (user_id, food_name, quantity_grams, calories, protein, carbs, fat, meal_type, log_date) 
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, CURRENT_DATE)) 
      RETURNING id, user_id, log_date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type, created_at
    `;
    queryParams = [
      userId,
      food_name,
      quantity_grams,
      calories,
      protein,
      carbs,
      fat,
      meal_type,
      log_date || null
    ];
  }

  const result = await db.query(queryText, queryParams);
  return result.rows[0];
};

/**
 * Dynamically updates an existing food log entry.
 * Checks that the log entry belongs to the user.
 */
const updateFoodLogEntry = async (userId, logId, updateData) => {
  const allowedFields = [
    'food_name',
    'quantity_grams',
    'calories',
    'protein',
    'carbs',
    'fat',
    'meal_type',
    'log_date'
  ];

  const setClause = [];
  const queryValues = [];
  let paramIndex = 1;

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      setClause.push(`${field} = $${paramIndex}`);
      queryValues.push(updateData[field]);
      paramIndex++;
    }
  });

  if (setClause.length === 0) return null;

  // Add log ID and user ID to check criteria
  queryValues.push(logId);
  const logIdParam = paramIndex;
  paramIndex++;

  queryValues.push(userId);
  const userIdParam = paramIndex;

  const queryText = `
    UPDATE food_logs 
    SET ${setClause.join(', ')} 
    WHERE id = $${logIdParam} AND user_id = $${userIdParam} 
    RETURNING id, user_id, log_date, food_name, quantity_grams, calories, protein, carbs, fat, meal_type, created_at
  `;

  const result = await db.query(queryText, queryValues);
  return result.rows[0];
};

/**
 * Deletes a food log entry.
 * Checks that the log entry belongs to the user.
 */
const deleteFoodLogEntry = async (userId, logId) => {
  const queryText = `
    DELETE FROM food_logs 
    WHERE id = $1 AND user_id = $2 
    RETURNING id
  `;
  const result = await db.query(queryText, [logId, userId]);
  return result.rows[0];
};

module.exports = {
  getFoodLogsByUserId,
  createFoodLogEntry,
  updateFoodLogEntry,
  deleteFoodLogEntry
};
