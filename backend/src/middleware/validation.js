const { AppError } = require('./error');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validation for registering new accounts.
 */
const validateRegister = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address.', 400));
  }

  if (!password || password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long.', 400));
  }

  next();
};

/**
 * Validation for user login attempts.
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address.', 400));
  }

  if (!password) {
    return next(new AppError('Please provide your password.', 400));
  }

  next();
};

/**
 * Validation for profile updates.
 */
const validateProfileUpdate = (req, res, next) => {
  const { age, weight, height, gender, activity_level, water_target } = req.body;

  if (age !== undefined) {
    const ageVal = parseInt(age, 10);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      return next(new AppError('Age must be a valid number between 1 and 120.', 400));
    }
  }

  if (weight !== undefined) {
    const weightVal = parseFloat(weight);
    if (isNaN(weightVal) || weightVal <= 0 || weightVal > 250) {
      return next(new AppError('Weight must be a valid positive number not exceeding 250 kg.', 400));
    }
  }

  if (height !== undefined) {
    const heightVal = parseFloat(height);
    if (isNaN(heightVal) || heightVal <= 0 || heightVal > 300) {
      return next(new AppError('Height must be a valid positive number not exceeding 300 cm.', 400));
    }
  }

  if (gender !== undefined) {
    if (gender !== 'male' && gender !== 'female') {
      return next(new AppError('Gender must be either "male" or "female".', 400));
    }
  }

  if (activity_level !== undefined) {
    const activityVal = parseFloat(activity_level);
    const validLevels = [1.2, 1.375, 1.55, 1.725, 1.9];
    if (isNaN(activityVal) || !validLevels.includes(activityVal)) {
      return next(new AppError('Activity level must be one of: 1.2, 1.375, 1.55, 1.725, or 1.9.', 400));
    }
  }

  if (water_target !== undefined) {
    const waterVal = parseInt(water_target, 10);
    if (isNaN(waterVal) || waterVal <= 0 || waterVal > 10000) {
      return next(new AppError('Water target must be a valid positive number (max 10L/10000ml).', 400));
    }
  }

  // Normalize: optional fields not provided in the body are set to null
  // so service layers receive a clean null instead of undefined.
  const optionalProfileFields = [
    'age', 'weight', 'height', 'gender', 'activity_level', 'water_target',
    'macro_split', 'fitness_goal', 'custom_protein', 'custom_carbs', 'custom_fat'
  ];
  optionalProfileFields.forEach((field) => {
    if (req.body[field] === undefined) {
      req.body[field] = null;
    }
  });

  next();
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validation for food log creation (POST) and updating (PUT).
 * Mandates all fields for POST, enables optional fields for PUT.
 */
const validateFoodLog = (req, res, next) => {
  const { food_name, quantity_grams, calories, protein, carbs, fat, meal_type, log_date } = req.body;
  const isPost = req.method === 'POST';

  if (isPost || food_name !== undefined) {
    if (!food_name || typeof food_name !== 'string' || food_name.trim() === '') {
      return next(new AppError('Food name is required and must be a valid string.', 400));
    }
    if (food_name.trim().length > 255) {
      return next(new AppError('Food name must not exceed 255 characters.', 400));
    }
  }

  if (isPost || quantity_grams !== undefined) {
    const qty = parseFloat(quantity_grams);
    if (quantity_grams === undefined || isNaN(qty) || qty <= 0) {
      return next(new AppError('Quantity in grams must be a positive number.', 400));
    }
    // Upper bound: no single serving exceeds 10 kg (10,000 g). Values above
    // this are physiologically impossible and indicate a data entry error.
    if (qty > 10000) {
      return next(new AppError('Quantity in grams cannot exceed 10,000 g (10 kg).', 400));
    }
  }

  if (isPost || calories !== undefined) {
    const cals = parseInt(calories, 10);
    if (calories === undefined || isNaN(cals) || cals < 0) {
      return next(new AppError('Calories must be a non-negative integer.', 400));
    }
    // Upper bound: no single food item exceeds 10,000 kcal. Storing values
    // above this would skew daily total calculations and reports.
    if (cals > 10000) {
      return next(new AppError('Calories cannot exceed 10,000 kcal per entry.', 400));
    }
  }

  if (isPost || protein !== undefined) {
    const prot = parseFloat(protein);
    if (protein === undefined || isNaN(prot) || prot < 0) {
      return next(new AppError('Protein must be a non-negative number.', 400));
    }
  }

  if (isPost || carbs !== undefined) {
    const cb = parseFloat(carbs);
    if (carbs === undefined || isNaN(cb) || cb < 0) {
      return next(new AppError('Carbohydrates must be a non-negative number.', 400));
    }
  }

  if (isPost || fat !== undefined) {
    const f = parseFloat(fat);
    if (fat === undefined || isNaN(f) || f < 0) {
      return next(new AppError('Fat must be a non-negative number.', 400));
    }
  }

  if (isPost || meal_type !== undefined) {
    if (!meal_type || typeof meal_type !== 'string' || meal_type.trim() === '') {
      return next(new AppError('Meal type must be a valid string.', 400));
    }
    if (meal_type.trim().length > 20) {
      return next(new AppError('Meal type must not exceed 20 characters.', 400));
    }
  }

  if (log_date !== undefined && log_date !== null && !dateRegex.test(log_date)) {
    return next(new AppError('Log date must be in YYYY-MM-DD format.', 400));
  }

  // Normalize: optional nutritional fields absent from a PUT body are set to
  // null so the service layer receives a clean null instead of undefined.
  //
  // log_date is intentionally excluded from this list. The updateFoodLogEntry
  // service uses `updateData[field] !== undefined` to decide whether to
  // include a field in the SQL SET clause. Setting log_date to null when it
  // is not present in the PUT body would make the service write
  // `log_date = NULL`, silently wiping the existing date on every partial
  // update that does not resend a log_date. Keeping it as undefined means
  // the service skips it entirely, preserving the stored value.
  if (!isPost) {
    const optionalFoodFields = ['protein', 'carbs', 'fat'];
    optionalFoodFields.forEach((field) => {
      if (req.body[field] === undefined) {
        req.body[field] = null;
      }
    });
  }

  next();
};

/**
 * Validation for water log creation.
 * amount_ml must be a positive integer — float strings and non-numeric values are rejected.
 */
const validateWaterLog = (req, res, next) => {
  const { amount_ml, log_date } = req.body;

  // Reject missing, non-numeric types, and float strings.
  // parseInt('250abc') === 250 (silently accepts junk), so we validate with Number() first.
  if (amount_ml === undefined || amount_ml === null) {
    return next(new AppError('Amount in ml is required and must be a positive integer.', 400));
  }

  const asNumber = Number(amount_ml);
  if (!Number.isFinite(asNumber) || asNumber <= 0 || !Number.isInteger(asNumber)) {
    return next(new AppError('Amount in ml must be a positive integer.', 400));
  }

  if (log_date !== undefined && log_date !== null && !dateRegex.test(log_date)) {
    return next(new AppError('Log date must be in YYYY-MM-DD format.', 400));
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateFoodLog,
  validateWaterLog
};
