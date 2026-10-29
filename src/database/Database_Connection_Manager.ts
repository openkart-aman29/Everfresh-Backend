import { Pool, PoolClient, types as pgTypes } from 'pg';
import { ENV } from '@/configurations/ENV_Configuration';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

const databaseLogger = createFeatureLogger('Database');

// A PostgreSQL DATE is a calendar day with no time and no zone, but pg maps it
// to a JS Date at server-local midnight. Serialising that to JSON produces a
// UTC timestamp, so a booking on 2026-09-20 leaves the API as
// "2026-09-19T20:00:00.000Z" and lands on the previous day for any client whose
// offset differs from the server's. Returning the raw 'YYYY-MM-DD' text keeps a
// calendar date a calendar date - which is what the clients already expect.
const PG_DATE_OID = 1082;
pgTypes.setTypeParser(PG_DATE_OID, (value: string) => value);

let pool: Pool | null = null;

export const connectDatabase = async (): Promise<boolean> => {
    try {
        if (pool) {
            databaseLogger.info('PostgreSQL pool already initialized');
            return true;
        }

        pool = new Pool({
            host: ENV.DB_HOST,
            port: ENV.DB_PORT,
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