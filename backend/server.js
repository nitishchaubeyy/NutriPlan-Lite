// Load environment variables first
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set.'
  );
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    'FATAL: JWT_SECRET must be at least 32 characters long.'
  );
}

const logger = require('./src/config/logger');

// Catch uncaught synchronous exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server immediately...');
  logger.error(err);
  process.exit(1);
});

const app = require('./src/app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 4000;

// Test the database pool connection on startup
db.pool.connect((err, client, release) => {
  if (err) {
    logger.error('Database connection test failed on startup:');
    logger.error(err);
  } else {
    logger.info('Database connection test successful. Client connected to pool.');
    release();
  }
});

// Start listening for HTTP requests
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in [${process.env.NODE_ENV || 'development'}] mode.`);
});

// Catch unhandled asynchronous promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down server gracefully...');
  logger.error(err);
  server.close(() => {
    process.exit(1);
  });
});
