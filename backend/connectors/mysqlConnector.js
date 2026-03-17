const mysql = require('mysql2/promise');

/**
 * MySQL Connector
 * Fetches product data from external MySQL databases
 */
async function fetchFromMySQL(config) {
  const { connection, table, query } = config;

  if (!connection) {
    throw new Error('MySQL connection configuration is required');
  }

  if (!table && !query) {
    throw new Error('Table name or custom query is required');
  }

  let conn;
  console.log(`[MySQL Connector] Connecting to MySQL...`);

  try {
    conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port || 3306,
      user: connection.user,
      password: connection.password,
      database: connection.database,
      connectTimeout: 10000,
    });

    console.log(`[MySQL Connector] Connected successfully`);

    const sqlQuery = query || `SELECT * FROM ${table} LIMIT 10000`;
    const [rows] = await conn.execute(sqlQuery);

    console.log(`[MySQL Connector] Fetched ${rows.length} products`);
    return rows;
  } catch (error) {
    console.error('[MySQL Connector] Error:', error.message);
    throw new Error(`Failed to connect to MySQL: ${error.message}`);
  } finally {
    if (conn) {
      await conn.end();
      console.log('[MySQL Connector] Connection closed');
    }
  }
}

module.exports = { fetchFromMySQL };
