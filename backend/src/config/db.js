const { Pool } = require('pg');
const logger = require('./logger');

const isProduction = process.env.NODE_ENV === 'production';

let poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else {
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  };
}

// Enable SSL in production and verify the server certificate.
// Supabase presents a CA-signed certificate, so rejectUnauthorized must remain
// true (the default). Setting it to false would silently accept any certificate,
// including those presented by a MITM proxy, and must never be used in production.
if (isProduction && process.env.DATABASE_URL) {
  poolConfig.ssl = true;
}

const pool = new Pool(poolConfig);

// Log pool connection events
pool.on('connect', () => {
  logger.debug('Database client checked out from pool.');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
