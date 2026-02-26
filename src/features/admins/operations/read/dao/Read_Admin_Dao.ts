
import { getDatabase } from '@/database/Database_Connection_Manager';
import { AdminDetailsResponse } from '@/features/admins/interfaces/Admin_Response.interface';

export class ReadAdminDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async getAdminById(
        adminId: string,
        companyId: string | null
    ): Promise<AdminDetailsResponse | null> {
        const pool = this.getPool();

        /* Query admin details with roles */
        const result = await pool.query(
            `
            WITH admin_user AS (
                SELECT 
                    a.admin_id,
                    u.user_id,
                    u.company_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active,
                    u.email_verified,
                    u.phone_verified,
                    u.last_login,
                    u.created_at,
                    u.updated_at
                FROM admins a
                JOIN users u ON a.user_id = u.user_id
                WHERE a.admin_id = $1
                  ${companyId ? 'AND a.company_id = $2' : ''}
                  AND a.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            ),
            user_roles_data AS (
                SELECT 
                    ur.user_id,
                    ARRAY_AGG(DISTINCT r.role_code) AS roles
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.role_id
                WHERE ur.user_id = (SELECT user_id FROM admin_user)
                GROUP BY ur.user_id
            )
            SELECT 
                au.admin_id,
                au.user_id,
                au.company_id,
                au.email,
                au.first_name,
                au.last_name,
                au.phone,
                au.is_active,
                au.email_verified,
                au.phone_verified,
                au.last_login,
                au.created_at,
                au.updated_at,
                COALESCE(urd.roles, ARRAY[]::TEXT[]) AS roles
            FROM admin_user au
            LEFT JOIN user_roles_data urd ON au.user_id = urd.user_id
            GROUP BY 
                au.admin_id, au.user_id, au.company_id, au.email, au.first_name,
                au.last_name, au.phone, au.is_active, au.email_verified,
                au.phone_verified, au.last_login, au.created_at, 
                au.updated_at, urd.roles
            `,
            companyId ? [adminId, companyId] : [adminId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const admin = result.rows[0];

        /* Verify this is actually an admin */
        const isAdmin = admin.roles.includes('admin') || admin.roles.includes('super_admin');

        if (!isAdmin) {
            return null;
        }

        return {
            admin_id: admin.admin_id,
            user_id: admin.user_id,
            company_id: admin.company_id,
            email: admin.email,
            first_name: admin.first_name,
            last_name: admin.last_name,
            phone: admin.phone,
            is_active: admin.is_active,
            email_verified: admin.email_verified,
            phone_verified: admin.phone_verified,
            last_login: admin.last_login,
            created_at: admin.created_at,
            updated_at: admin.updated_at,
            roles: admin.roles
        };
    }
}