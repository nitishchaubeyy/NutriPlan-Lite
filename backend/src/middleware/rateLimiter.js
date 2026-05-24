const rateLimit = require('express-rate-limit');


/**
 * 
 * Rate limiter middleware for authentication routes (register and login)
 * Limits requests from a single IP to 100 attempts per 15-minute window
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  authLimiter
};
