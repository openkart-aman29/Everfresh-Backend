// src/features/customers/operations/read_single_customer/dao/Read_Customer_DAO.ts
import { BaseCustomerDAO } from '@/features/customers/database/dao/Base_Customer_DAO';
import { CustomerResponse } from '@/features/customers/interfaces/Customer_Response.interface';

/**
 * DAO: Fetch single customer with full details and mapping to API response
 */
class ReadCustomerDAO extends BaseCustomerDAO {
    async readCustomer(
        customerId: string,
        companyId: string
    ): Promise<{ success: boolean; customer?: CustomerResponse | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }

            const query = `
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
                WHERE c.customer_id = $1
                  AND c.company_id = $2
                  AND c.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;

            const result = await pool.query(query, [customerId, companyId]);

            if (result.rows.length === 0) {
                return { success: true, customer: null };
            }

            const row = result.rows[0];

            // Map to API response
            const customer: CustomerResponse = {
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
            };

            return {
                success: true,
                customer
            };

        } catch (error) {
            this.logError('readCustomer', error);
            return { success: false };
        }
    }
}

export async function readCustomerDAO(
    customerId: string,
    companyId: string
): Promise<{ success: boolean; customer?: CustomerResponse | null }> {
    const dao = new ReadCustomerDAO();
    return dao.readCustomer(customerId, companyId);
}