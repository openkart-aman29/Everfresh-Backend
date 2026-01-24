// src/features/customers/operations/update_customer/dao/Update_Customer_DAO.ts
import { BaseCustomerDAO } from '@/features/customers/database/dao/Base_Customer_DAO';
import { CustomerResponse } from '@/features/customers/interfaces/Customer_Response.interface';

/**
 * DAO: Update customer user profile
 */
class UpdateCustomerDAO extends BaseCustomerDAO {
    async updateCustomerUserProfile(
        userId: string,
        updates: { first_name?: string; last_name?: string; phone?: string }
    ): Promise<{ success: boolean; updatedCustomer?: CustomerResponse | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }

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
                WHERE user_id = $${paramIndex}
                  AND deleted_at IS NULL
                RETURNING user_id, email, first_name, last_name, phone, created_at, updated_at
            `;
            params.push(userId);

            const result = await pool.query(query, params);

            if (result.rows.length === 0) {
                return { success: true, updatedCustomer: null };
            }

            const userRow = result.rows[0];

            // Fetch the full customer data including customer fields
            const customerQuery = `
                SELECT
                    c.customer_id,
                    c.company_id,
                    c.user_id,
                    c.total_bookings,
                    c.lifetime_value,
                    c.created_at as customer_created_at,
                    c.updated_at as customer_updated_at,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.created_at as user_created_at,
                    u.updated_at as user_updated_at
                FROM customers c
                JOIN users u ON c.user_id = u.user_id
                WHERE c.user_id = $1
                  AND c.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;

            const customerResult = await pool.query(customerQuery, [userId]);

            if (customerResult.rows.length === 0) {
                return { success: true, updatedCustomer: null };
            }

            const row = customerResult.rows[0];

            // Map to API response
            const updatedCustomer: CustomerResponse = {
                customer_id: row.customer_id,
                company_id: row.company_id,
                user_id: row.user_id,
                email: row.email,
                first_name: row.first_name,
                last_name: row.last_name,
                phone: row.phone,
                total_bookings: row.total_bookings,
                lifetime_value: parseFloat(row.lifetime_value),
                created_at: row.customer_created_at.toISOString(),
                updated_at: row.customer_updated_at.toISOString(),
            };

            return {
                success: true,
                updatedCustomer
            };

        } catch (error) {
            this.logError('updateCustomerUserProfile', error);
            return { success: false };
        }
    }
}

export async function updateCustomerUserProfileDAO(
    userId: string,
    updates: { first_name?: string; last_name?: string; phone?: string }
): Promise<{ success: boolean; updatedCustomer?: CustomerResponse | null }> {
    const dao = new UpdateCustomerDAO();
    return dao.updateCustomerUserProfile(userId, updates);
}