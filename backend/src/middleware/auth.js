const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError } = require('./error');

/**
 * Route protection middleware.
 *
 * Accepts a JWT from two sources, in preference order:
 *   1. The HttpOnly `nutriplan_token` cookie (set by the backend on login /
 *      register). This is the preferred transport because the cookie is never
 *      accessible to JavaScript, making it immune to XSS token theft.
 *   2. The `Authorization: Bearer <token>` header, kept for backward
 *      compatibility with non-browser clients (mobile apps, API consumers).
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1) Prefer the HttpOnly cookie (set automatically by the browser on
    //    same-origin requests and cross-origin requests when credentials: 'include'
    //    is set in the fetch call).
    if (req.cookies && req.cookies.nutriplan_token) {
      token = req.cookies.nutriplan_token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Fallback: Bearer header for non-browser clients.
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

    // 3) Confirm that the user still exists and the token has not been revoked.
    //    token_version is incremented on logout, so any token issued before the
    //    last logout will carry a stale version and is rejected here.
    const userResult = await db.query(
      'SELECT id, email, token_version FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    const currentUser = userResult.rows[0];

    // Only enforce the version check if the token actually carries the field.
    // Tokens issued before this migration was applied will not have it, so we
    // allow them through once and they pick up a versioned token on next login.
    if (
      decoded.version !== undefined &&
      decoded.version !== currentUser.token_version
    ) {
      return next(
        new AppError('Your session has been revoked. Please log in again.', 401)
      );
    }

    // 4) Attach user object to request and proceed
    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  protect
};
