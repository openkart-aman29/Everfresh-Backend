
import { getDatabase } from '@/database/Database_Connection_Manager';
import { adminLogger } from '@/features/admins/logger/Admin_Logger';

export class DeleteAdminDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async softDeleteAdminAndUser(adminId: string, companyId: string | null): Promise<boolean> {
        const pool = this.getPool();

        try {
            // 1. Get user_id from admins table
            // Ensure admin exists, belongs to company, and is not already deleted
            const findAdminQuery = `
                SELECT user_id 
                FROM admins 
                WHERE admin_id = $1 ${companyId ? 'AND company_id = $2' : ''} AND deleted_at IS NULL
            `;
            const findResult = await pool.query(findAdminQuery, companyId ? [adminId, companyId] : [adminId]);

            if (findResult.rows.length === 0) {
                return false;
            }

            const userId = findResult.rows[0].user_id;

            // 2. Start Transaction
            await pool.query('BEGIN');

            try {
                // 3. Soft delete admin
                const deleteAdminQuery = `
                    UPDATE admins
                    SET deleted_at = NOW()
                    WHERE admin_id = $1 ${companyId ? 'AND company_id = $2' : ''}
                `;
                await pool.query(deleteAdminQuery, companyId ? [adminId, companyId] : [adminId]);

                // 4. Soft delete user
                const deleteUserQuery = `
                    UPDATE users
                    SET deleted_at = NOW()
                    WHERE user_id = $1
                `;
                await pool.query(deleteUserQuery, [userId]);

                // 5. Commit Transaction
                await pool.query('COMMIT');
                return true;

            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }

        } catch (error) {
            adminLogger.error('Error soft deleting admin and user', { adminId, companyId, error });
            throw error;
        }
    }
}

export async function deleteAdminDAO(
    adminId: string,
    companyId: string | null
): Promise<boolean> {
    const dao = new DeleteAdminDAO();
    return dao.softDeleteAdminAndUser(adminId, companyId);
}
