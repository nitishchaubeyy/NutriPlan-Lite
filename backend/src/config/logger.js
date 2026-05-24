const winston = require('winston');

const logFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
  return `[${timestamp}] [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), logFormat)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
