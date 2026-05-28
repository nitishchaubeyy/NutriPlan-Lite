const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { createDefaultProfile } = require('../services/profile');
const { AppError } = require('../middleware/error');

/**
 * Sign JWT token for a user.
 * Embeds token_version so the protect middleware can detect tokens that were
 * issued before the user's last logout and reject them immediately.
 *
 * @param {string|number} id           - User primary key
 * @param {number}        tokenVersion - Current token_version from the users row
 */
const signToken = (id, tokenVersion) => {
  return jwt.sign(
    { id, version: tokenVersion },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Set authentication cookies on the response.
 *
 * Two cookies are written:
 *   - nutriplan_token: the JWT itself, HttpOnly and Secure so it is never
 *     accessible to JavaScript and cannot be stolen via XSS.
 *   - nutriplan_session_exp: the token's exp claim (Unix epoch, seconds) as a
 *     plain string. This cookie is NOT HttpOnly so the frontend can read it to
 *     determine login state and token expiry without ever touching the token.
 *
 * @param {object} res    - Express response object
 * @param {string} token  - Signed JWT
 */
const setAuthCookies = (res, token) => {
  const decoded = jwt.decode(token);
  const maxAgeMs = decoded && decoded.exp
    ? (decoded.exp - Math.floor(Date.now() / 1000)) * 1000
    : 7 * 24 * 60 * 60 * 1000; // 7 days fallback

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('nutriplan_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: maxAgeMs,
    path: '/',
  });

  // Readable (non-HttpOnly) cookie carrying only the expiry timestamp.
  // The frontend uses this to check login state without accessing the token.
  if (decoded && decoded.exp) {
    res.cookie('nutriplan_session_exp', String(decoded.exp), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: maxAgeMs,
      path: '/',
    });
  }
};

/**
 * Clear both authentication cookies.
 *
 * @param {object} res - Express response object
 */
const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const clearOpts = { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/' };
  res.clearCookie('nutriplan_token', clearOpts);
  res.clearCookie('nutriplan_session_exp', { ...clearOpts, httpOnly: false });
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
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at, token_version',
      [email, hashedPassword]
    );
    const newUser = newUserResult.rows[0];

    // 4) Create default profile linked to the user
    await createDefaultProfile(newUser.id, client);

    await client.query('COMMIT');

    // 5) Generate JWT, set it as an HttpOnly cookie, and respond.
    //    The token is also returned in the response body for clients that
    //    prefer Bearer-header transport (e.g. mobile apps, API consumers).
    const token = signToken(newUser.id, newUser.token_version);
    setAuthCookies(res, token);

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
    // 1) Await user lookup and resolve the row immediately
    const userResult = await db.query(
      'SELECT id, email, password_hash, token_version FROM users WHERE email = $1',
      [email]
    );
    const user = userResult.rows[0];

    // 2) Guard: ensure user exists before attempting hash comparison.
    //    Separating the checks prevents TypeError on undefined access
    //    and keeps timing consistent (bcrypt.compare always runs).
    if (!user) {
      return next(new AppError('Incorrect email or password.', 401));
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return next(new AppError('Incorrect email or password.', 401));
    }

    // 3) Generate JWT, set it as an HttpOnly cookie, and return.
    //    The token is also included in the response body for non-browser clients.
    const token = signToken(user.id, user.token_version);
    setAuthCookies(res, token);

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
 * Revokes all outstanding JWTs by incrementing the user's token_version.
 * Any token carrying the old version will be rejected by the protect middleware
 * from this point forward, regardless of its exp claim.
 */
const logout = async (req, res, next) => {
  try {
    await db.query(
      'UPDATE users SET token_version = token_version + 1 WHERE id = $1',
      [req.user.id]
    );

    // Clear the auth cookies so browsers that store the session via cookie
    // are also signed out immediately without waiting for token expiry.
    clearAuthCookies(res);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  setAuthCookies,
  clearAuthCookies
};
