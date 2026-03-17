const { importProducts } = require('../../services/importService');

/**
 * POST /api/import/connector
 * Import products from external sources via connectors
 */
exports.importFromConnector = async (req, res) => {
  try {
    console.log('[Connector Import] Starting import...', {
      type: req.body.type,
      branchId: req.body.branchId,
    });

    // Get vendor ID from authenticated user
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.userId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor authentication required',
      });
    }

    const config = {
      branchId: req.body.branchId,
      type: req.body.type,
      ...req.body,
    };

    // Validate connector type
    const validTypes = ['api', 'mongodb', 'mysql', 'postgres', 'postgresql'];
    if (!config.type || !validTypes.includes(config.type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid connector type. Supported types: ${validTypes.join(', ')}`,
      });
    }

    // Import products
    const results = await importProducts(config, vendorId);

    return res.status(200).json({
      success: true,
      message: `Import completed: ${results.successful} products imported, ${results.failed} failed`,
      branchId: req.body.branchId,
      imported: results.successful,
      failed: results.failed,
      results,
    });
  } catch (error) {
    console.error('[Connector Import] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Import failed',
    });
  }
};
