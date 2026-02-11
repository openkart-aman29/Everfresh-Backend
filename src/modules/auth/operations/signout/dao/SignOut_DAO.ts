import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';

class SignOutDAO extends BaseAuthDAO {
    async revokeRefreshToken(hashedToken: string): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return false;
            }

            const query = `
                UPDATE refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE hashed_token = $1
                  AND revoked_at IS NULL
                  AND expires_at > CURRENT_TIMESTAMP
            `;

            const result = await pool.query(query, [hashedToken]);

            this.logInfo('revokeRefreshToken', {
                revoked: (result.rowCount ?? 0) > 0
            });

            return (result.rowCount ?? 0) > 0;

        } catch (error) {
            this.logError('revokeRefreshToken', error);
            return false;
        }
    }
}

export async function revokeRefreshToken(
    hashedToken: string
): Promise<boolean> {
    const dao = new SignOutDAO();
    return dao.revokeRefreshToken(hashedToken);
}