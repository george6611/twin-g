const { Client } = require('pg');

/**
 * PostgreSQL Connector
 * Fetches product data from external PostgreSQL databases
 */
async function fetchFromPostgres(config) {
  const { connection, table, query } = config;

  if (!connection) {
    throw new Error('PostgreSQL connection configuration is required');
  }

  if (!table && !query) {
    throw new Error('Table name or custom query is required');
  }

  const client = new Client({
    host: connection.host,
    port: connection.port || 5432,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    connectionTimeoutMillis: 10000,
  });

  console.log(`[PostgreSQL Connector] Connecting to PostgreSQL...`);

  try {
    await client.connect();
    console.log(`[PostgreSQL Connector] Connected successfully`);

    const sqlQuery = query || `SELECT * FROM ${table} LIMIT 10000`;
    const result = await client.query(sqlQuery);

    console.log(`[PostgreSQL Connector] Fetched ${result.rows.length} products`);
    return result.rows;
  } catch (error) {
    console.error('[PostgreSQL Connector] Error:', error.message);
    throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
  } finally {
    await client.end();
    console.log('[PostgreSQL Connector] Connection closed');
  }
}

module.exports = { fetchFromPostgres };
