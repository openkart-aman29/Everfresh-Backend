// src/features/bookings/database/dao/Base_Booking_DAO.ts
import { Pool } from 'pg';
import { getDatabase } from '@/database/Database_Connection_Manager';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';

/**
 * Base DAO class for all booking-related data access operations
 * Provides common database utilities and error handling
 */
export abstract class BaseBookingDAO {
    /**
     * Get PostgreSQL connection pool
     * @returns Pool instance or null if not available
     */
    protected getPool(): Pool | null {
        try {
            const pool = getDatabase();
            if (!pool) {
                bookingLogger.error('Database pool not available');
                return null;
            }
            return pool;
        } catch (error) {
            bookingLogger.error(`Error getting database pool: ${error}`);
            return null;
        }
    }

    /**
     * Log error with context
     * @param operation - Name of the operation
     * @param error - Error object
     */
    protected logError(operation: string, error: any): void {
        bookingLogger.error(`Error in ${operation}: ${error}`, {
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
    ): Promise<any | null> {
        try {
            const pool = this.getPool();
            if (!pool) return null;

            const result = await pool.query(query, values);
            return result;
        } catch (error) {
            this.logError('executeQuery', error);
            return null;
        }
    }

    /**
     * Map database row to camelCase object
     * @param row - Database row with snake_case columns
     * @returns Mapped object with camelCase properties
     */
    protected mapRowToCamelCase(row: any): any {
        const mapped: any = {};
        for (const key in row) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            mapped[camelKey] = row[key];
        }
        return mapped;
    }
}
