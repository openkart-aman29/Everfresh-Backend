// src/features/customers/database/dao/Base_Customer_DAO.ts
import { Pool } from 'pg';
import { getDatabase } from '@/database/Database_Connection_Manager';
import { customerLogger } from '@/features/customers/logger/Customer_Logger';

/**
 * Base DAO class for all customer-related data access operations
 * Provides common database utilities and error handling
 */
export abstract class BaseCustomerDAO {
    /**
     * Get PostgreSQL connection pool
     * @returns Pool instance or null if not available
     */
    protected getPool(): Pool | null {
        try {
            const pool = getDatabase();
            if (!pool) {
                customerLogger.error('Database pool not available');
                return null;
            }
            return pool;
        } catch (error) {
            customerLogger.error(`Error getting database pool: ${error}`);
            return null;
        }
    }

    /**
     * Log error with context
     * @param operation - Name of the operation
     * @param error - Error object
     */
    protected logError(operation: string, error: any): void {
        customerLogger.error(`Error in ${operation}: ${error}`, {
            operation,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
    }

    /**
     * Execute query with error handling
     * @param query - SQL query string
     * @param values - Query parameters
     * @returns Query result or null on error
     */
    protected async executeQuery(
        query: string,
        values?: any[]
    ): Promise<any[] | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return null;
            }

            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            this.logError('executeQuery', error);
            return null;
        }
    }
}