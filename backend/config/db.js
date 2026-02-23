const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool with SSL enabled (required for TiDB Cloud Serverless)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,          // TiDB Cloud uses port 4000
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: {
        rejectUnauthorized: false               // Allows SSL without strict certificate validation
        // For production, you can use the CA certificate instead:
         ca: fs.readFileSync(path.join(__dirname, '../certs/ca.pem'))
    }
});

// Convert pool to use promises (so you can use async/await)
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

module.exports = {
    pool: promisePool,
    testConnection
};
