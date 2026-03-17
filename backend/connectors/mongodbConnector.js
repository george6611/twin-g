const { MongoClient } = require('mongodb');

/**
 * MongoDB Connector
 * Fetches product data from external MongoDB databases
 */
async function fetchFromMongoDB(config) {
  const { connection, collection } = config;

  if (!connection || !connection.uri) {
    throw new Error('MongoDB connection URI is required');
  }

  if (!collection) {
    throw new Error('Collection name is required');
  }

  let client;
  console.log(`[MongoDB Connector] Connecting to MongoDB...`);

  try {
    client = new MongoClient(connection.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });

    await client.connect();
    console.log(`[MongoDB Connector] Connected successfully`);

    const db = client.db();
    const coll = db.collection(collection);

    // Fetch products with a reasonable limit
    const products = await coll.find({}).limit(10000).toArray();

    console.log(`[MongoDB Connector] Fetched ${products.length} products from ${collection}`);
    return products;
  } catch (error) {
    console.error('[MongoDB Connector] Error:', error.message);
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  } finally {
    if (client) {
      await client.close();
      console.log('[MongoDB Connector] Connection closed');
    }
  }
}

module.exports = { fetchFromMongoDB };
