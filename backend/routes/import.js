const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { importFromConnector } = require('../controllers/import/connectorController');

/**
 * Import Routes
 * Base path: /api/import
 */

// POST /api/import/connector - Import products from external connectors
router.post('/connector', protect, importFromConnector);

module.exports = router;
