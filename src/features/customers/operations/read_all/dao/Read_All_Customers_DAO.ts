// src/features/customers/operations/read_all_customers/dao/Read_All_Customers_DAO.ts
import { BaseCustomerDAO } from '@/features/customers/database/dao/Base_Customer_DAO';
import { CustomerResponse } from '@/features/customers/interfaces/Customer_Response.interface';

interface ReadAllCustomersResult {
    customers: CustomerResponse[];
    totalCount: number;
}

/**
 * DAO: Fetch paginated list of customers with search and sorting
 */
class ReadAllCustomersDAO extends BaseCustomerDAO {
    async readAllCustomers(
        companyId: string,
        limit: number,
        offset: number,
        search?: string,
        sortBy: string = 'created_at',
        sortOrder: string = 'desc'
    ): Promise<{ success: boolean; data?: ReadAllCustomersResult }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }

            // Build the WHERE clause for search
            let whereClause = '';
            let searchParam = '';

            if (search) {
                whereClause = ` AND (
                    u.first_name ILIKE $4
                    OR u.last_name ILIKE $4
                    OR u.email ILIKE $4
                    OR u.phone ILIKE $4
                )`;
                searchParam = `%${search}%`;
            }

            // Build the ORDER BY clause
            const validSortColumns = ['created_at', 'first_name', 'last_name', 'email'];
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

            // Query for customers list
            const customersQuery = `
                SELECT
                    c.customer_id,
                    c.company_id,
                    c.user_id,
                    c.total_bookings,
                    c.lifetime_value,
                    c.created_at,
                    c.updated_at,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone
                FROM customers c
                JOIN users u ON c.user_id = u.user_id
                WHERE c.company_id = $1
                  AND c.deleted_at IS NULL
                  AND u.deleted_at IS NULL
                  ${whereClause}
                ORDER BY ${sortColumn} ${sortDirection}
                LIMIT $2 OFFSET $3
            `;

            // Query for total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM customers c
                JOIN users u ON c.user_id = u.user_id
                WHERE c.company_id = $1
                  AND c.deleted_at IS NULL
                  AND u.deleted_at IS NULL
                  ${whereClause}
            `;

            const params = search ? [companyId, limit, offset, searchParam] : [companyId, limit, offset];

            // Execute both queries
            const [customersResult, countResult] = await Promise.all([
                pool.query(customersQuery, params),
                pool.query(countQuery, params.slice(0, search ? 2 : 1).concat(search ? [searchParam] : []))
            ]);

            // Map results to CustomerResponse
            const customers: CustomerResponse[] = customersResult.rows.map(row => ({
                customer_id: row.customer_id,
                company_id: row.company_id,
                user_id: row.user_id,
                email: row.email,
                first_name: row.first_name,
                last_name: row.last_name,
                phone: row.phone,
                total_bookings: row.total_bookings,
                lifetime_value: parseFloat(row.lifetime_value),
                created_at: row.created_at.toISOString(),
                updated_at: row.updated_at.toISOString(),
            }));

            const totalCount = parseInt(countResult.rows[0].total, 10);

            return {
                success: true,
                data: {
                    customers,
                    totalCount
                }
            };

        } catch (error) {
            this.logError('readAllCustomers', error);
            return { success: false };
        }
    }
}

export async function readAllCustomersDAO(
    companyId: string,
    limit: number,
    offset: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string
): Promise<{ success: boolean; data?: ReadAllCustomersResult }> {
    const dao = new ReadAllCustomersDAO();
    return dao.readAllCustomers(companyId, limit, offset, search, sortBy, sortOrder);
}