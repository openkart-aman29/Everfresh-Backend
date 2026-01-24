import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { RefreshTokenInterface } from '@/modules/auth/interface/Token_Interface';

class RefreshTokenDAO extends BaseAuthDAO {
    async getTokenByHash(hashedToken: string): Promise<RefreshTokenInterface | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return null;
            }

            const query = `
                SELECT *
                FROM refresh_tokens
                WHERE hashed_token = $1
                  AND revoked_at IS NULL
                  AND expires_at > CURRENT_TIMESTAMP
            `;

            const result = await pool.query(query, [hashedToken]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            this.logError('getTokenByHash', error);
            return null;
        }
    }

    async updateLastUsed(tokenId: string): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return false;
            }

            const query = `
                UPDATE refresh_tokens
                SET last_used_at = CURRENT_TIMESTAMP
                WHERE token_id = $1
            `;

            await pool.query(query, [tokenId]);
            return true;

        } catch (error) {
            this.logError('updateLastUsed', error);
            return false;
        }
    }
}

export async function getRefreshTokenByHash(
    hashedToken: string
): Promise<RefreshTokenInterface | null> {
    const dao = new RefreshTokenDAO();
    return dao.getTokenByHash(hashedToken);
}

export async function updateTokenLastUsed(tokenId: string): Promise<boolean> {
    const dao = new RefreshTokenDAO();
    return dao.updateLastUsed(tokenId);
}