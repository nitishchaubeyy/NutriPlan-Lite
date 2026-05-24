const express = require('express');
const { getHealth } = require('../controllers/health');

const router = express.Router();

// GET /api/v1/health maps to getHealth controller
router.get('/', getHealth);

module.exports = router;
