import { Pool } from 'pg';
import { getDatabase } from '@/database/Database_Connection_Manager';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';

export abstract class BaseAuthDAO {
    protected getPool(): Pool | null {
        try {
            const pool = getDatabase();
            if (!pool) {
                authLogger.error('Database pool not available');
                return null;
            }
            return pool;
        } catch (error) {
            authLogger.error(`Error getting database pool: ${error}`);
            return null;
        }
    }

    protected logError(operation: string, error: any): void {
        authLogger.error(`Error in ${operation}: ${error}`);
    }

    protected logInfo(operation: string, info: any): void {
        authLogger.info(`${operation}`, info);
    }
}