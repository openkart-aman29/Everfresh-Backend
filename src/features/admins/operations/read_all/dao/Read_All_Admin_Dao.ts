
import { getDatabase } from '@/database/Database_Connection_Manager';
import { AdminDetailsResponse } from '@/features/admins/interfaces/Admin_Response.interface';

interface ReadAllAdminsResult {
    admins: AdminDetailsResponse[];
    totalCount: number;
}

export class ReadAllAdminDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async readAllAdmins(
        companyId: string | null,
        limit: number,
        offset: number,
        search?: string,
        sortBy: string = 'created_at',
        sortOrder: string = 'desc',
        isActive?: boolean
    ): Promise<{ success: boolean; data?: ReadAllAdminsResult }> {
        const pool = this.getPool();

        try {
            let whereClause = `
                WHERE u.deleted_at IS NULL 
                AND a.deleted_at IS NULL
            `;
            const queryParams: any[] = [];
            let paramIndex = 1;

            if (companyId) {
                whereClause += ` AND u.company_id = $${paramIndex}`;
                queryParams.push(companyId);
                paramIndex++;
            }


            // Search filter
            if (search) {
                whereClause += ` AND (
                    u.first_name ILIKE $${paramIndex} OR 
                    u.last_name ILIKE $${paramIndex} OR 
                    u.email ILIKE $${paramIndex} OR 
                    u.phone ILIKE $${paramIndex}
                )`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            // Active status filter
            if (isActive !== undefined) {
                whereClause += ` AND u.is_active = $${paramIndex}`;
                queryParams.push(isActive);
                paramIndex++;
            }

            // Count Query
            const countQuery = `
                SELECT COUNT(DISTINCT a.admin_id)
                FROM admins a
                JOIN users u ON a.user_id = u.user_id
                ${whereClause}
            `;

            // Data Query
            // Sorting mapping to handle specific fields if needed, 
            // but for now strictly mapping to user fields or admin fields.
            const sortColumn = sortBy === 'created_at' ? 'a.created_at' : `u.${sortBy}`;
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const dataQuery = `
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
                    a.created_at,
                    a.updated_at,
                    ARRAY_AGG(DISTINCT r.role_code) AS roles
                FROM admins a
                JOIN users u ON a.user_id = u.user_id
                LEFT JOIN user_roles ur ON u.user_id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.role_id
                ${whereClause}
                GROUP BY 
                    a.admin_id, u.user_id, u.company_id, u.email, 
                    u.first_name, u.last_name, u.phone, u.is_active, 
                    u.email_verified, u.phone_verified, u.last_login, 
                    a.created_at, a.updated_at
                ORDER BY ${sortColumn} ${order}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            // Execute queries in parallel
            const [countResult, dataResult] = await Promise.all([
                pool.query(countQuery, queryParams.slice(0, paramIndex - 1)), // Exclude limit/offset for count
                pool.query(dataQuery, queryParams)
            ]);

            const totalCount = parseInt(countResult.rows[0].count, 10);

            const admins: AdminDetailsResponse[] = dataResult.rows.map(row => ({
                admin_id: row.admin_id,
                user_id: row.user_id,
                company_id: row.company_id,
                email: row.email,
                first_name: row.first_name,
                last_name: row.last_name,
                phone: row.phone,
                is_active: row.is_active,
                email_verified: row.email_verified,
                phone_verified: row.phone_verified,
                last_login: row.last_login,
                created_at: row.created_at,
                updated_at: row.updated_at,
                roles: row.roles || []
            }));

            return {
                success: true,
                data: {
                    admins,
                    totalCount
                }
            };

        } catch (error) {
            console.error('Error in ReadAllAdminDAO:', error); // Basic logging, service will handle structured logging
            return { success: false };
        }
    }
}

export async function readAllAdminDAO(
    companyId: string | null,
    limit: number,
    offset: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
    isActive?: boolean
): Promise<{ success: boolean; data?: ReadAllAdminsResult }> {
    const dao = new ReadAllAdminDAO();
    return dao.readAllAdmins(companyId, limit, offset, search, sortBy, sortOrder, isActive);
}
