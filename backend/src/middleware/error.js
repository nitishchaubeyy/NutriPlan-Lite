const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';
  const message = err.message || 'Internal Server Error';

  // Log the complete error (including stack trace)
  logger.error(err);

  if (process.env.NODE_ENV === 'production') {
    // In production, don't leak stack trace or non-operational details
    if (err.isOperational) {
      return res.status(statusCode).json({
        status,
        message
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong on our server.'
    });
  }

  // In development, return detailed error details
  return res.status(statusCode).json({
    status,
    message,
    error: err,
    stack: err.stack
  });
};

module.exports = {
  AppError,
  errorHandler
};
