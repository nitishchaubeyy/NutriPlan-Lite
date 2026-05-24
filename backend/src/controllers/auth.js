const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { createDefaultProfile } = require('../services/profile');
const { AppError } = require('../middleware/error');

/**
 * Sign JWT token for a user ID
 */
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_nutriplan_token_key',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * POST /api/v1/auth/register
 * Atomically registers a user and initializes their profile record.
 */
const register = async (req, res, next) => {
  const { email, password } = req.body;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Check if user already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      throw new AppError('A user with that email already exists.', 400);
    }

    // 2) Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3) Create user
    const newUserResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    );
    const newUser = newUserResult.rows[0];

    // 4) Create default profile linked to the user
    await createDefaultProfile(newUser.id, client);

    await client.query('COMMIT');

    // 5) Generate JWT and respond
    const token = signToken(newUser.id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          created_at: newUser.created_at
        }
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * POST /api/v1/auth/login
 * Validates credentials and generates JWT.
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1) Find user and get password hash
    const userResult = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = userResult.rows[0];

    // 2) Validate password hash
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return next(new AppError('Incorrect email or password.', 401));
    }

    // 3) Generate JWT and return
    const token = signToken(user.id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user.id,
          email: user.email
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 * Confirms successful logout (stateless).
 */
const logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully.'
  });
};

module.exports = {
  register,
  login,
  logout
};
