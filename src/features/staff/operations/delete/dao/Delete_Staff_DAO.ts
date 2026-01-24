// src/features/staff/operations/delete_staff/dao/Delete_Staff_DAO.ts
import { StaffDAO } from '@/features/staff/database/dao/Staff_DAO';
import { getDatabase } from '@/database/Database_Connection_Manager';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';

export class DeleteStaffDAO {
    private staffDAO = new StaffDAO();

    async softDeleteStaffAndUser(staffId: string, companyId: string): Promise<boolean> {
        try {
            const pool = getDatabase();
            if (!pool) {
                staffLogger.error('Database pool not available for delete operation');
                return false;
            }

            // First, get the user_id from the staff record
            const staffQuery = `
                SELECT user_id FROM staff
                WHERE staff_id = $1
                  AND company_id = $2
                  AND deleted_at IS NULL
            `;
            const staffResult = await pool.query(staffQuery, [staffId, companyId]);

            if (staffResult.rows.length === 0) {
                return false; // Staff not found or already deleted
            }

            const userId = staffResult.rows[0].user_id;

            // Soft delete both staff and user in a transaction
            await pool.query('BEGIN');

            try {
                // Soft delete staff
                const staffDeleteQuery = `
                    UPDATE staff
                    SET deleted_at = NOW()
                    WHERE staff_id = $1
                      AND company_id = $2
                      AND deleted_at IS NULL
                `;
                await pool.query(staffDeleteQuery, [staffId, companyId]);

                // Soft delete user
                const userDeleteQuery = `
                    UPDATE users
                    SET deleted_at = NOW()
                    WHERE user_id = $1
                      AND deleted_at IS NULL
                `;
                await pool.query(userDeleteQuery, [userId]);

                await pool.query('COMMIT');
                return true;

            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }

        } catch (error) {
            staffLogger.error('Error soft deleting staff and user', { staffId, companyId, error });
            throw error;
        }
    }
}