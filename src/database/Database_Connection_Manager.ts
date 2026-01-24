import { Pool, PoolClient } from 'pg';
import { ENV } from '@/configurations/ENV_Configuration';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

const databaseLogger = createFeatureLogger('Database');

let pool: Pool | null = null;

export const connectDatabase = async (): Promise<boolean> => {
    try {
        pool = new Pool({
            host: ENV.DB_HOST,  //10.10.0.20
            port: ENV.DB_PORT,  //5432
            database: ENV.DB_NAME,
            user: ENV.DB_USER,
            password: ENV.DB_PASSWORD,
            max: 20,                    // Maximum pool size
            min: 3,                     // Minimum pool size
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        // Test connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        databaseLogger.info('PostgreSQL connected successfully');
        return true;
    } catch (error) {
        databaseLogger.error('PostgreSQL connection failed', error);
        return false;
    }
};

export const getDatabase = (): Pool | null => {
    if (!pool) {
        databaseLogger.error('Database pool not initialized');
        return null;
    }
    return pool;
};

export const closeDatabase = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        pool = null;
        databaseLogger.info('Database connection closed');
    }
};