import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';

interface UserWithRoles {
    user_id: string;
    company_id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone: string;
    is_active: boolean;
    email_verified: boolean;
    roles: string[];
    customer_id?: string | null;
    staff_id?: string | null;
}

class SignInDAO extends BaseAuthDAO {
    async getUserByEmail(email: string): Promise<UserWithRoles | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return null;
            }

            const query = `
                
SELECT
                    u.user_id,
                    u.company_id,
                    u.email,
                    u.password_hash,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active,
                    u.email_verified,
					c.customer_id,
                    s.staff_id,
                    ARRAY_AGG(r.role_code) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.user_id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.role_id
                LEFT JOIN customers c
                    ON c.user_id = u.user_id
                AND c.deleted_at IS NULL
                LEFT JOIN staff s
                    ON s.user_id = u.user_id
                AND s.deleted_at IS NULL
                WHERE u.email = $1
				AND u.deleted_at IS NULL
                GROUP BY  u.user_id,
                        c.customer_id,
                        s.staff_id;

            `;

            const result = await pool.query(query, [email.toLowerCase()]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            this.logError('getUserByEmail', error);
            return null;
        }
    }

    async updateLastLogin(userId: string): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return false;
            }

            const query = `
                UPDATE users
                SET last_login = CURRENT_TIMESTAMP
                WHERE user_id = $1
            `;

            await pool.query(query, [userId]);
            return true;

        } catch (error) {
            this.logError('updateLastLogin', error);
            return false;
        }
    }

    async getUserById(userId: string): Promise<UserWithRoles | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return null;
            }

            const query = `
                SELECT
                    u.user_id,
                    u.company_id,
                    u.email,
                    u.password_hash,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active,
                    u.email_verified,
                    ARRAY_AGG(r.role_code) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.user_id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.role_id
                WHERE u.user_id = $1
                  AND u.deleted_at IS NULL
                GROUP BY u.user_id
            `;

            const result = await pool.query(query, [userId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            this.logError('getUserById', error);
            return null;
        }
    }
}

export async function getUserByEmail(email: string): Promise<UserWithRoles | null> {
    const dao = new SignInDAO();
    return dao.getUserByEmail(email);
}

export async function updateUserLastLogin(userId: string): Promise<boolean> {
    const dao = new SignInDAO();
    return dao.updateLastLogin(userId);
}

export async function getUserById(userId: string): Promise<UserWithRoles | null> {
    const dao = new SignInDAO();
    return dao.getUserById(userId);
}