// src/features/health/operations/read/dao/Read_Health_Dao.ts

import { getDatabase } from '@/database/Database_Connection_Manager';
import { DatabaseHealth } from '@/features/health/interfaces/Health_Response.interface';
import { healthLogger } from '@/features/health/logger/Health_Logger';

export class ReadHealthDAO {
    /**
     * Probes the PostgreSQL connection with a trivial query and measures
     * round-trip latency. Unlike other DAOs this one never throws - an
     * unreachable database IS the result the health check needs to report.
     */
    async checkDatabase(): Promise<DatabaseHealth> {
        const pool = getDatabase();

        if (!pool) {
            healthLogger.warn('Health check - database pool not initialised');
            return {
                status: 'disconnected',
                latency_ms: null,
                pool: null,
                error: 'Database pool not available'
            };
        }

        const startedAt = Date.now();

        try {
            await pool.query('SELECT 1');

            return {
                status: 'connected',
                latency_ms: Date.now() - startedAt,
                pool: {
                    total: pool.totalCount,
                    idle: pool.idleCount,
                    waiting: pool.waitingCount
                },
                error: null
            };
        } catch (error) {
            healthLogger.error('Health check - database probe failed', { error });

            return {
                status: 'error',
                latency_ms: Date.now() - startedAt,
                pool: {
                    total: pool.totalCount,
                    idle: pool.idleCount,
                    waiting: pool.waitingCount
                },
                error: error instanceof Error ? error.message : 'Unknown database error'
            };
        }
    }
}

export const readHealthDAO = new ReadHealthDAO();
