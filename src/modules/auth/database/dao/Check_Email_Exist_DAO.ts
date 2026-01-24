import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';

export class CheckEmailExistDAO extends BaseAuthDAO {
    async checkEmailExists(email: string): Promise<boolean> {
        const pool = this.getPool();
        if (!pool) {
            throw new Error('Database pool not available');
        }

        const query = `
            SELECT EXISTS(
                SELECT 1 FROM users
                WHERE email = $1 AND deleted_at IS NULL
            ) as exists
        `;
        const result = await pool.query<{ exists: boolean }>(query, [email]);
        return result.rows[0]?.exists || false;
    }

    async checkEmailExistsExcludingUser(email: string, excludeUserId: string): Promise<boolean> {
        const pool = this.getPool();
        if (!pool) {
            throw new Error('Database pool not available');
        }

        const query = `
            SELECT EXISTS(
                SELECT 1 FROM users
                WHERE email = $1 AND user_id != $2 AND deleted_at IS NULL
            ) as exists
        `;
        const result = await pool.query<{ exists: boolean }>(query, [email, excludeUserId]);
        return result.rows[0]?.exists || false;
    }
}