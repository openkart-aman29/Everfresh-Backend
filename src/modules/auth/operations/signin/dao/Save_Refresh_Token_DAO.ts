import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { RefreshTokenInterface, RefreshTokenDBInterface } from '@/modules/auth/interface/Token_Interface';

class SaveRefreshTokenDAO extends BaseAuthDAO {
    async saveToken(tokenData: Omit<RefreshTokenDBInterface, 'created_at'>): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return false;
            }

            const query = `
                INSERT INTO refresh_tokens (
                    token_id, user_id, hashed_token,
                    expires_at, device_info, ip_address,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;

            const values = [
                tokenData.token_id,
                tokenData.user_id,
                tokenData.hashed_token,
                tokenData.expires_at,
                tokenData.device_info || null,
                tokenData.ip_address || null,
                new Date()
            ];

            await pool.query(query, values);
            this.logInfo('saveToken', { token_id: tokenData.token_id });
            return true;

        } catch (error) {
            this.logError('saveToken', error);
            return false;
        }
    }
}

export async function saveRefreshToken(
    tokenData: Omit<RefreshTokenDBInterface, 'created_at'>
): Promise<boolean> {
    const dao = new SaveRefreshTokenDAO();
    return dao.saveToken(tokenData);
}