import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';

class CheckUserExistDAO extends BaseAuthDAO {
    async checkByEmail(
        email: string
    ): Promise<{ exists: boolean; user_id?: string }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { exists: false };
            }

            const query = `
                SELECT user_id
                FROM users
                WHERE email = $1
                  AND deleted_at IS NULL
            `;

            const result = await pool.query(query, [email.toLowerCase()]);

            if (result.rows.length > 0) {
                return {
                    exists: true,
                    user_id: result.rows[0].user_id
                };
            }

            return { exists: false };
        } catch (error) {
            this.logError('checkByEmail', error);
            return { exists: false };
        }
    }

    async checkById(
        userId: string
    ): Promise<{ exists: boolean; is_active?: boolean }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { exists: false };
            }

            const query = `
                SELECT is_active
                FROM users
                WHERE user_id = $1
                  AND deleted_at IS NULL
            `;

            const result = await pool.query(query, [userId]);

            if (result.rows.length > 0) {
                return {
                    exists: true,
                    is_active: result.rows[0].is_active
                };
            }

            return { exists: false };
        } catch (error) {
            this.logError('checkById', error);
            return { exists: false };
        }
    }

    async checkByPhone(
        phone: string
    ): Promise<{ exists: boolean; user_id?: string }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { exists: false };
            }

            const query = `
                SELECT user_id
                FROM users
                WHERE phone = $1
                  AND deleted_at IS NULL
            `;

            const result = await pool.query(query, [phone]);


            if (result.rows.length > 0) {
                return {
                    exists: true,
                    user_id: result.rows[0].user_id
                };
            }

            return { exists: false };
        } catch (error) {
            this.logError('checkByPhone', error);
            return { exists: false };
        }
    }
}

export async function checkUserExistByEmail(
    email: string
): Promise<{ exists: boolean; user_id?: string }> {
    const dao = new CheckUserExistDAO();
    return dao.checkByEmail(email);
}

export async function checkUserExistById(
    userId: string
): Promise<{ exists: boolean; is_active?: boolean }> {
    const dao = new CheckUserExistDAO();
    return dao.checkById(userId);
}


export async function checkUserExistByPhone(
    phone: string
): Promise<{ exists: boolean; user_id?: string }> {
    const dao = new CheckUserExistDAO();
    return dao.checkByPhone(phone);
}
