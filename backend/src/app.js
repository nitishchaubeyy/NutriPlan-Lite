const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const logger = require('./config/logger');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const foodLogRouter = require('./routes/foodLog');
const waterLogRouter = require('./routes/waterLog');
const { AppError, errorHandler } = require('./middleware/error');

const app = express();

// Set up security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Set up HTTP request logger streamed through winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);

// Register API Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/food-logs', foodLogRouter);
app.use('/api/v1/water-logs', waterLogRouter);

// Catch all unregistered routes and return 404
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
