const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError } = require('./error');

/**
 * Route protection middleware. Checks Authorization header for a valid Bearer JWT.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1) Verify presence of authorization header and Bearer token format
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in. Please log in to obtain access.', 401)
      );
    }

    // 2) Verify the JWT signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (err) {
      // Distinguish expired tokens from other JWT errors (malformed, bad signature, etc.)
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      return next(
        new AppError('Invalid or expired authentication token. Please log in again.', 401)
      );
    }

    // 3) Confirm that the user still exists in the database
    const userResult = await db.query(
      'SELECT id, email FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4) Attach user object to request and proceed
    req.user = userResult.rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  protect
};
