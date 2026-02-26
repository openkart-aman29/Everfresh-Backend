
import { getDatabase } from '@/database/Database_Connection_Manager';
import { AdminDetailsResponse } from '@/features/admins/interfaces/Admin_Response.interface';
import { UpdateAdminInput } from '@/features/admins/interfaces/Admin_Request.interface';

// Reusing ReadAdminDAO logic effectively by re-fetching, 
// but for update we just need to return the updated structure.
// We can import ReadAdminDAO to fetch the updated record cleanly.
import { ReadAdminDAO } from '@/features/admins/operations/read/dao/Read_Admin_Dao';

export class UpdateAdminDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    private readAdminDAO = new ReadAdminDAO();

    async updateAdmin(
        input: UpdateAdminInput
    ): Promise<AdminDetailsResponse | null> {
        const pool = this.getPool();
        const { adminId, companyId, updates } = input;

        try {
            // 1. Get user_id from admins table
            // We need to ensure the admin exists and belongs to the company first.
            const findAdminQuery = `
                SELECT user_id 
                FROM admins 
                WHERE admin_id = $1 ${companyId ? 'AND company_id = $2' : ''} AND deleted_at IS NULL
            `;
            const findResult = await pool.query(findAdminQuery, companyId ? [adminId, companyId] : [adminId]);

            if (findResult.rows.length === 0) {
                return null;
            }

            const userId = findResult.rows[0].user_id;

            // 2. Construct dynamic update query for USERS table
            const userFields: string[] = [];
            const userValues: any[] = [];
            let paramIndex = 1;

            if (updates.first_name !== undefined) {
                userFields.push(`first_name = $${paramIndex++}`);
                userValues.push(updates.first_name);
            }
            if (updates.last_name !== undefined) {
                userFields.push(`last_name = $${paramIndex++}`);
                userValues.push(updates.last_name);
            }
            if (updates.email !== undefined) {
                userFields.push(`email = $${paramIndex++}`);
                userValues.push(updates.email);
            }
            if (updates.phone !== undefined) {
                userFields.push(`phone = $${paramIndex++}`);
                userValues.push(updates.phone);
            }
            if (updates.is_active !== undefined) {
                userFields.push(`is_active = $${paramIndex++}`);
                userValues.push(updates.is_active);
            }

            // Only execute update if there are fields to update
            if (userFields.length > 0) {
                userValues.push(userId); // Add userId as search param

                const updateQuery = `
                    UPDATE users 
                    SET ${userFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $${paramIndex}
                `;

                await pool.query(updateQuery, userValues);
            }

            // 3. Return updated admin details
            // Re-using ReadAdminDAO to ensure consistent response structure
            return await this.readAdminDAO.getAdminById(adminId, companyId);

        } catch (error) {
            throw error; // Let service handle error (e.g., unique constraint violation for email)
        }
    }
}

export async function updateAdminDAO(
    input: UpdateAdminInput
): Promise<AdminDetailsResponse | null> {
    const dao = new UpdateAdminDAO();
    return dao.updateAdmin(input);
}
