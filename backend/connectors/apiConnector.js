const axios = require('axios');

/**
 * API Connector
 * Fetches product data from external REST APIs
 */
async function fetchFromAPI(config) {
  const { endpoint, headers = {}, method = 'GET', body = null } = config;

  if (!endpoint) {
    throw new Error('API endpoint is required');
  }

  console.log(`[API Connector] Fetching from: ${endpoint}`);

  try {
    const response = await axios({
      method,
      url: endpoint,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
      data: body,
      timeout: 30000, // 30 second timeout
      maxContentLength: 50 * 1024 * 1024, // 50MB max
    });

    const data = response.data;

    // Handle different response structures
    let products = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data.products && Array.isArray(data.products)) {
      products = data.products;
    } else if (data.data && Array.isArray(data.data)) {
      products = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      products = data.items;
    } else if (typeof data === 'object') {
      products = [data];
    }

    console.log(`[API Connector] Fetched ${products.length} products`);
    return products;
  } catch (error) {
    console.error('[API Connector] Error:', error.message);
    throw new Error(`Failed to fetch from API: ${error.message}`);
  }
}

module.exports = { fetchFromAPI };
