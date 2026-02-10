import { getDatabase } from '@/database/Database_Connection_Manager';
import { StaffDBInterface, StaffWithUserDBInterface } from '@/features/staff/interfaces/Staff_DB.interface';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';

export class StaffDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            staffLogger.error('Database pool not available');
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async getStaffById(staffId: string, companyId: string): Promise<StaffWithUserDBInterface | null> {
        try {
            const pool = this.getPool();
            const query = `
                SELECT
                    s.staff_id,
                    s.company_id,
                    s.user_id,
                    s.is_available,
                    s.skills,
                    s.created_at,
                    s.updated_at,
                    s.deleted_at,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone
                FROM staff s
                JOIN users u ON s.user_id = u.user_id
                WHERE s.staff_id = $1
                  AND s.company_id = $2
                  AND s.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;
            const result = await pool.query(query, [staffId, companyId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            staffLogger.error('Error fetching staff by ID', { staffId, companyId, error });
            throw error;
        }
    }

    async getAllStaff(
        companyId: string,
        limit: number,
        offset: number,
        search?: string,
        sortBy: string = 'created_at',
        sortOrder: string = 'desc',
        availableOnly: boolean = false
    ): Promise<StaffWithUserDBInterface[]> {
        try {
            const pool = this.getPool();
            let query = `
                SELECT
                    s.staff_id,
                    s.company_id,
                    s.user_id,
                    s.is_available,
                    s.skills,
                    s.created_at,
                    s.updated_at,
                    s.deleted_at,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active
                FROM staff s
                JOIN users u ON s.user_id = u.user_id
                WHERE s.company_id = $1 
                  AND s.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;
            const params: any[] = [companyId];
            let paramIndex = 2;

            if (availableOnly) {
                query += ` AND s.is_available = $${paramIndex}`;
                params.push(true);
                paramIndex++;
            }

            if (search) {
                query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            const validSortColumns = ['created_at', 'first_name', 'last_name', 'email'];
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

            query += ` ORDER BY ${sortColumn} ${sortDirection} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            staffLogger.error('Error fetching all staff', { companyId, limit, offset, search, availableOnly, error });
            throw error;
        }
    }

    async getStaffCount(
        companyId: string,
        search?: string,
        availableOnly: boolean = false
    ): Promise<number> {
        try {
            const pool = this.getPool();
            let query = `
                SELECT COUNT(*) as total
                FROM staff s
                JOIN users u ON s.user_id = u.user_id
                WHERE s.company_id = $1
                  AND s.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;
            const params: any[] = [companyId];

            if (availableOnly) {
                query += ` AND s.is_available = $2`;
                params.push(true);
            }

            if (search) {
                const searchIndex = availableOnly ? 3 : 2;
                query += ` AND (u.email ILIKE $${searchIndex} OR u.first_name ILIKE $${searchIndex} OR u.last_name ILIKE $${searchIndex} OR u.phone ILIKE $${searchIndex})`;
                params.push(`%${search}%`);
            }

            const result = await pool.query(query, params);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            staffLogger.error('Error fetching staff count', { companyId, search, availableOnly, error });
            throw error;
        }
    }

    async updateStaffProfile(
        staffId: string,
        companyId: string,
        updates: { first_name?: string; last_name?: string; phone?: string }
    ): Promise<StaffWithUserDBInterface | null> {
        try {
            const pool = this.getPool();
            const setParts: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (updates.first_name !== undefined) {
                setParts.push(`first_name = $${paramIndex}`);
                params.push(updates.first_name);
                paramIndex++;
            }
            if (updates.last_name !== undefined) {
                setParts.push(`last_name = $${paramIndex}`);
                params.push(updates.last_name);
                paramIndex++;
            }
            if (updates.phone !== undefined) {
                setParts.push(`phone = $${paramIndex}`);
                params.push(updates.phone);
                paramIndex++;
            }

            setParts.push(`updated_at = NOW()`);

            const query = `
                UPDATE users
                SET ${setParts.join(', ')}
                WHERE user_id = (
                    SELECT user_id FROM staff
                    WHERE staff_id = $${paramIndex}
                      AND company_id = $${paramIndex + 1}
                      AND deleted_at IS NULL
                )
                RETURNING *
            `;
            params.push(staffId, companyId);

            const result = await pool.query(query, params);
            if (result.rows.length === 0) {
                return null;
            }

            // Fetch the updated staff data
            return await this.getStaffById(staffId, companyId);
        } catch (error) {
            staffLogger.error('Error updating staff profile', { staffId, companyId, updates, error });
            throw error;
        }
    }

    async updateStaffAvailability(
        staffId: string,
        companyId: string,
        isAvailable: boolean
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            const query = `
                UPDATE staff
                SET is_available = $1, updated_at = NOW()
                WHERE staff_id = $2
                  AND company_id = $3
                  AND deleted_at IS NULL
            `;
            const result = await pool.query(query, [isAvailable, staffId, companyId]);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            staffLogger.error('Error updating staff availability', { staffId, companyId, isAvailable, error });
            throw error;
        }
    }

     async updateStaffStatus(
        staffId: string,
        companyId: string,
        isActive: boolean
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            const query = `
                UPDATE users
    SET is_active = $1,
        updated_at = NOW()
    WHERE user_id = (
        SELECT user_id 
        FROM staff 
        WHERE staff_id = $2
          AND company_id = $3
          AND deleted_at IS NULL
    )
            `;
            const result = await pool.query(query, [isActive, staffId, companyId]);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            staffLogger.error('Error updating staff status', { staffId, companyId, isActive, error });
            throw error;
        }
    }

    async updateStaffSkills(
        staffId: string,
        companyId: string,
        skills: string[]
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            const query = `
                UPDATE staff
                SET skills = $1, updated_at = NOW()
                WHERE staff_id = $2
                  AND company_id = $3
                  AND deleted_at IS NULL
            `;
            const result = await pool.query(query, [JSON.stringify(skills), staffId, companyId]);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            staffLogger.error('Error updating staff skills', { staffId, companyId, skills, error });
            throw error;
        }
    }

    async softDeleteStaff(staffId: string, companyId: string): Promise<boolean> {
        try {
            const pool = this.getPool();
            const query = `
                UPDATE staff
                SET deleted_at = NOW()
                WHERE staff_id = $1
                  AND company_id = $2
                  AND deleted_at IS NULL
            `;
            const result = await pool.query(query, [staffId, companyId]);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            staffLogger.error('Error soft deleting staff', { staffId, companyId, error });
            throw error;
        }
    }
}