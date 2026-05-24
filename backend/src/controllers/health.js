const db = require('../config/db');

/**
 * GET /api/v1/health
 * Verifies system uptime, server status, and PostgreSQL database connectivity.
 */
const getHealth = async (req, res, next) => {
  try {
    let dbStatus = 'UP';
    let dbError = null;

    try {
      // Execute a lightweight query to test pool connectivity
      await db.query('SELECT 1');
    } catch (err) {
      dbStatus = 'DOWN';
      dbError = err.message;
    }

    const healthStatus = {
      status: dbStatus === 'UP' ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus
      },
      uptime: parseFloat(process.uptime().toFixed(2))
    };

    if (dbStatus === 'DOWN') {
      healthStatus.services.database_error = dbError;
      return res.status(503).json(healthStatus);
    }

    return res.status(200).json(healthStatus);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHealth
};
