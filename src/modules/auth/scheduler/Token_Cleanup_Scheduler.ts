import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';

export class TokenCleanupScheduler extends BaseAuthDAO {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    private readonly TOKEN_EXPIRY_DAYS = 30; // Delete tokens older than 30 days

    start(): void {
        authLogger.info('Starting token cleanup scheduler');
        this.intervalId = setInterval(() => {
            this.cleanupExpiredTokens();
        }, this.CLEANUP_INTERVAL);

        // Run initial cleanup
        this.cleanupExpiredTokens();
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            authLogger.info('Token cleanup scheduler stopped');
        }
    }

    private async cleanupExpiredTokens(): Promise<void> {
        try {
            authLogger.info('Running token cleanup');

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.TOKEN_EXPIRY_DAYS);

            // Delete expired refresh tokens
            const deleteQuery = `
                DELETE FROM refresh_tokens
                WHERE expires_at < $1 OR revoked_at IS NOT NULL
            `;

            const pool = this.getPool();
            if (!pool) {
                authLogger.warn('Database pool not available for token cleanup');
                return;
            }

            const result = await pool.query(deleteQuery, [cutoffDate]);
            authLogger.info('Token cleanup completed', { deletedCount: result.rowCount });
        } catch (error: any) {
            // Check if it's a "relation does not exist" error (table not created yet)
            if (error.code === '42P01') {
                authLogger.info('Token cleanup skipped - refresh_tokens table does not exist yet');
            } else {
                authLogger.error('Token cleanup failed', error);
            }
        }
    }
}

export const tokenCleanupScheduler = new TokenCleanupScheduler();